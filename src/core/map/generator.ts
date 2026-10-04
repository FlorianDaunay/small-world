import { createRng, type Rng } from "../util/rng";
import { neighbours } from "./hex";
import { buildTopology, connectedGroups } from "./topology";
import { LAND_TERRAINS, isWater, type Feature, type GameMap, type RegionDef, type Terrain } from "./types";

export interface GeneratorOptions {
  cols: number;
  rows: number;
  regions: number;
  seed: number;
  id: string;
  name: string;
}

/** Recommended map size for each player count (mirrors the board game's boards). */
export const MAP_PRESETS: Record<number, { cols: number; rows: number; regions: number }> = {
  2: { cols: 11, rows: 9, regions: 23 },
  3: { cols: 13, rows: 10, regions: 30 },
  4: { cols: 15, rows: 11, regions: 39 },
  5: { cols: 17, rows: 12, regions: 48 },
};

/** Splits the grid into `count` organic regions by growing them from scattered seeds. */
function growRegions(cols: number, rows: number, count: number, rng: Rng): number[] {
  const total = cols * rows;
  const cells = new Array<number>(total).fill(-1);
  const minDistance = Math.sqrt(total / count) * 0.8;
  const seeds: number[] = [];
  const pos = (i: number) => ({ x: (i % cols) + 0.5 * (Math.floor(i / cols) % 2), y: Math.floor(i / cols) * 0.87 });

  for (let attempt = 0; seeds.length < count && attempt < total * 40; attempt++) {
    const candidate = rng.int(0, total - 1);
    const relax = attempt > total * 20 ? 0.5 : 1;
    const p = pos(candidate);
    if (seeds.every((s) => cells[candidate] < 0 && Math.hypot(pos(s).x - p.x, pos(s).y - p.y) >= minDistance * relax)) {
      cells[candidate] = seeds.length;
      seeds.push(candidate);
    }
  }

  const frontiers = seeds.map((s) => [s]);
  const sizes = seeds.map(() => 1);
  let remaining = total - seeds.length;
  while (remaining > 0) {
    // The smallest regions grow first so sizes stay close to each other.
    const order = seeds.map((_, i) => i).sort((a, b) => sizes[a] - sizes[b] || rng.next() - 0.5);
    let grew = false;
    for (const region of order) {
      const frontier = frontiers[region];
      while (frontier.length) {
        const pickAt = rng.int(0, frontier.length - 1);
        const from = frontier[pickAt];
        const free = neighbours(from, cols, rows).filter((n) => n >= 0 && cells[n] < 0);
        if (free.length === 0) {
          frontier.splice(pickAt, 1);
          continue;
        }
        const cell = rng.pick(free);
        cells[cell] = region;
        frontier.push(cell);
        sizes[region]++;
        remaining--;
        grew = true;
        break;
      }
      if (grew) break;
    }
    if (!grew) break;
  }
  return cells;
}

function assignTerrains(map: GameMap, rng: Rng): void {
  const topology = buildTopology(map);
  const count = map.regions.length;

  // Seas hug the border; one lake sits inland. Water must never cut the land in two.
  const seaCount = Math.max(1, Math.round(count * 0.07));
  const edgeRegions = rng.shuffle(map.regions.map((_, i) => i).filter((i) => topology.edge[i]));
  const innerRegions = rng.shuffle(map.regions.map((_, i) => i).filter((i) => !topology.edge[i]));
  const water = new Map<number, Terrain>();
  const landStaysConnected = () =>
    connectedGroups(topology, (r) => !water.has(r)).length === 1;

  for (const region of edgeRegions) {
    if ([...water.keys()].filter((r) => water.get(r) === "sea").length >= seaCount) break;
    if (topology.adjacency[region].some((n) => water.has(n))) continue;
    water.set(region, "sea");
    if (!landStaysConnected()) water.delete(region);
  }
  for (const region of innerRegions) {
    if (topology.adjacency[region].some((n) => water.has(n))) continue;
    water.set(region, "lake");
    if (landStaysConnected()) break;
    water.delete(region);
  }

  const land = map.regions.map((_, i) => i).filter((i) => !water.has(i));
  const pool = rng.shuffle(land.map((_, i) => LAND_TERRAINS[i % LAND_TERRAINS.length]));
  const terrain = new Array<Terrain>(count);
  water.forEach((t, r) => (terrain[r] = t));
  land.forEach((r, i) => (terrain[r] = pool[i]));

  // A few swap passes break up clumps of identical terrain.
  const clash = (r: number) => topology.adjacency[r].filter((n) => terrain[n] === terrain[r]).length;
  for (let pass = 0; pass < 6; pass++) {
    for (const a of land) {
      if (clash(a) === 0) continue;
      const b = rng.pick(land);
      const before = clash(a) + clash(b);
      [terrain[a], terrain[b]] = [terrain[b], terrain[a]];
      if (clash(a) + clash(b) > before) [terrain[a], terrain[b]] = [terrain[b], terrain[a]];
    }
  }

  map.regions = terrain.map((t) => ({ terrain: t, features: [] }));
}

function assignFeatures(regions: RegionDef[], rng: Rng): void {
  const land = regions.map((_, i) => i).filter((i) => !isWater(regions[i].terrain));
  const per = Math.max(1, Math.round(land.length / 6));
  const place = (feature: Feature, amount: number, allowed: (r: RegionDef) => boolean) => {
    const candidates = rng.shuffle(land.filter((i) => allowed(regions[i]) && regions[i].features.length === 0));
    candidates.slice(0, amount).forEach((i) => regions[i].features.push(feature));
  };
  place("magic", per, (r) => r.terrain !== "mountain");
  place("mine", per, (r) => r.terrain === "mountain" || r.terrain === "hill" || r.terrain === "forest");
  place("cave", per, (r) => r.terrain === "mountain" || r.terrain === "hill" || r.terrain === "swamp");
  const tribes = rng.shuffle(land.filter((i) => regions[i].terrain !== "mountain"));
  tribes.slice(0, Math.round(land.length * 0.3)).forEach((i) => regions[i].features.push("lostTribe"));
}

/** Builds a complete, playable random map. Same options and seed give the same map. */
export function generateMap(options: GeneratorOptions): GameMap {
  const rng = createRng(options.seed);
  const cells = growRegions(options.cols, options.rows, options.regions, rng);
  const regionCount = Math.max(...cells) + 1;
  const now = Date.now();
  const map: GameMap = {
    id: options.id,
    name: options.name,
    cols: options.cols,
    rows: options.rows,
    cells,
    regions: Array.from({ length: regionCount }, () => ({ terrain: "farmland" as Terrain, features: [] })),
    createdAt: now,
    updatedAt: now,
  };
  assignTerrains(map, rng);
  assignFeatures(map.regions, rng);
  return map;
}
