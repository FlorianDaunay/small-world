import { MAP_PRESETS } from "./generator";
import { buildTopology, connectedGroups } from "./topology";
import { FEATURES, LAND_TERRAINS, TERRAINS, isWater, type Feature, type GameMap, type Terrain } from "./types";

export type IssueSeverity = "error" | "warning" | "info";

/** One finding of the balance review. `key` is an i18n key (`balance.<key>`), `params` fill it. */
export interface BalanceIssue {
  severity: IssueSeverity;
  key: string;
  params?: Record<string, string | number>;
}

export interface BalanceReport {
  /** 0 (unplayable) to 100 (well balanced). */
  score: number;
  /** No blocking error: the map can be used in a game. */
  playable: boolean;
  /** Player counts the map's size suits. */
  suitedPlayers: number[];
  stats: {
    regions: number;
    land: number;
    water: number;
    edgeLand: number;
    terrain: Record<Terrain, number>;
    features: Record<Feature, number>;
    smallestRegion: number;
    largestRegion: number;
  };
  issues: BalanceIssue[];
}

const pct = (value: number) => Math.round(value * 100);

/**
 * Reviews a map's balance: size for the player count, terrain and feature distribution,
 * connectivity and starting spots. Pure function, used live by the map editor.
 */
export function analyzeMap(map: GameMap, players?: number): BalanceReport {
  const topology = buildTopology(map);
  const issues: BalanceIssue[] = [];
  const used = map.regions.map((_, i) => topology.cellsOf[i].length > 0);
  const regionIds = map.regions.map((_, i) => i).filter((i) => used[i]);
  const landIds = regionIds.filter((i) => !isWater(map.regions[i].terrain));
  const waterIds = regionIds.filter((i) => isWater(map.regions[i].terrain));

  const terrain = Object.fromEntries(TERRAINS.map((t) => [t, 0])) as Record<Terrain, number>;
  const features = Object.fromEntries(FEATURES.map((f) => [f, 0])) as Record<Feature, number>;
  for (const i of regionIds) {
    terrain[map.regions[i].terrain]++;
    if (!isWater(map.regions[i].terrain)) for (const f of map.regions[i].features) features[f]++;
  }
  const sizes = regionIds.map((i) => topology.cellsOf[i].length);
  const edgeLand = landIds.filter((i) => topology.edge[i]).length;
  const stats = {
    regions: regionIds.length,
    land: landIds.length,
    water: waterIds.length,
    edgeLand,
    terrain,
    features,
    smallestRegion: sizes.length ? Math.min(...sizes) : 0,
    largestRegion: sizes.length ? Math.max(...sizes) : 0,
  };

  const suitedPlayers = Object.entries(MAP_PRESETS)
    .filter(([, preset]) => Math.abs(regionIds.length - preset.regions) <= preset.regions * 0.2)
    .map(([count]) => Number(count));

  if (landIds.length < 6) issues.push({ severity: "error", key: "tooFewLand", params: { count: landIds.length } });

  if (map.regions.some((_, i) => !used[i])) issues.push({ severity: "warning", key: "emptyRegions" });

  const groups = connectedGroups(topology, (r) => !isWater(map.regions[r].terrain));
  if (groups.length > 1) issues.push({ severity: "error", key: "disconnected", params: { count: groups.length } });

  const isolated = landIds.filter((i) => !topology.adjacency[i].some((n) => !isWater(map.regions[n].terrain)));
  if (isolated.length && landIds.length > 1) issues.push({ severity: "error", key: "isolated", params: { count: isolated.length } });

  if (players) {
    const target = MAP_PRESETS[players]?.regions;
    if (target && regionIds.length < target * 0.8) issues.push({ severity: "warning", key: "tooSmallFor", params: { players, count: regionIds.length, target } });
    if (target && regionIds.length > target * 1.2) issues.push({ severity: "warning", key: "tooLargeFor", params: { players, count: regionIds.length, target } });
    if (edgeLand < players) issues.push({ severity: "error", key: "fewStarts", params: { count: edgeLand, players } });
  } else if (edgeLand < 2) {
    issues.push({ severity: "error", key: "fewStarts", params: { count: edgeLand, players: 2 } });
  }
  if (suitedPlayers.length === 0 && landIds.length >= 6) issues.push({ severity: "info", key: "unusualSize", params: { count: regionIds.length } });

  const waterShare = regionIds.length ? waterIds.length / regionIds.length : 0;
  if (waterShare > 0.25) issues.push({ severity: "warning", key: "tooMuchWater", params: { share: pct(waterShare) } });
  if (waterIds.length === 0 && regionIds.length > 0) issues.push({ severity: "info", key: "noWater" });

  if (landIds.length >= 6) {
    for (const t of LAND_TERRAINS) {
      const share = terrain[t] / landIds.length;
      if (share > 0.32) issues.push({ severity: "warning", key: "tooMuchTerrain", params: { terrain: t, share: pct(share) } });
      else if (share < 0.08) issues.push({ severity: terrain[t] === 0 ? "warning" : "info", key: "tooLittleTerrain", params: { terrain: t, share: pct(share) } });
    }
    for (const f of ["magic", "mine", "cave"] as const) {
      const share = features[f] / landIds.length;
      if (features[f] === 0) issues.push({ severity: "warning", key: "missingFeature", params: { feature: f } });
      else if (share > 0.3) issues.push({ severity: "warning", key: "tooMuchFeature", params: { feature: f, share: pct(share) } });
    }
    const tribes = features.lostTribe / landIds.length;
    if (tribes > 0.5) issues.push({ severity: "warning", key: "tooManyTribes", params: { share: pct(tribes) } });
    else if (tribes < 0.1) issues.push({ severity: "info", key: "fewTribes", params: { share: pct(tribes) } });
  }

  if (stats.smallestRegion > 0 && stats.largestRegion / stats.smallestRegion > 5) {
    issues.push({ severity: "info", key: "unevenSizes", params: { min: stats.smallestRegion, max: stats.largestRegion } });
  }

  const clumps = landIds.filter((i) => topology.adjacency[i].some((n) => n > i && map.regions[n].terrain === map.regions[i].terrain)).length;
  if (landIds.length && clumps / landIds.length > 0.35) issues.push({ severity: "info", key: "clumpedTerrain" });

  const penalty = { error: 30, warning: 10, info: 3 } as const;
  const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, issue) => sum + penalty[issue.severity], 0)));
  const severityOrder = { error: 0, warning: 1, info: 2 } as const;
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { score, playable: !issues.some((i) => i.severity === "error"), suitedPlayers, stats, issues };
}
