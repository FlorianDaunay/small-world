import type { Feature, Terrain } from "@/core/map/types";
import { mix } from "@/themes/color";
import type { IconName } from "@/ui/icons/Icon";

/**
 * Map colors are deliberately independent of the UI theme: a map must read like a map
 * (blue water, green forests) whatever the theme. Players get a fixed, distinct palette too.
 */
export const TERRAIN_COLORS: Record<Terrain, string> = {
  farmland: "#E8D795",
  hill: "#B9CF83",
  forest: "#5A9558",
  swamp: "#86A08A",
  mountain: "#A99F95",
  sea: "#4A88C7",
  lake: "#7DB8E3",
};

/** Overall look of the map: seasons from the extensions repaint some terrains. */
export type MapAtmosphere = "default" | "winter" | "drought";

/** Motif drawn over a terrain's colour (see `textures.tsx`). */
export type Texture = "furrows" | "hills" | "trees" | "reeds" | "peaks" | "snowPeaks" | "waves" | "ripples" | "ice" | "cracks";

export interface TerrainLook {
  color: string;
  texture: Texture;
}

const BASE_LOOK: Record<Terrain, TerrainLook> = {
  farmland: { color: TERRAIN_COLORS.farmland, texture: "furrows" },
  hill: { color: TERRAIN_COLORS.hill, texture: "hills" },
  forest: { color: TERRAIN_COLORS.forest, texture: "trees" },
  swamp: { color: TERRAIN_COLORS.swamp, texture: "reeds" },
  mountain: { color: TERRAIN_COLORS.mountain, texture: "peaks" },
  sea: { color: TERRAIN_COLORS.sea, texture: "waves" },
  lake: { color: TERRAIN_COLORS.lake, texture: "ripples" },
};

const ATMOSPHERES: Record<MapAtmosphere, Partial<Record<Terrain, TerrainLook>>> = {
  default: {},
  winter: {
    farmland: { color: mix(TERRAIN_COLORS.farmland, "#F4F8FB", 0.45), texture: "furrows" },
    hill: { color: mix(TERRAIN_COLORS.hill, "#EEF4F7", 0.4), texture: "hills" },
    forest: { color: mix(TERRAIN_COLORS.forest, "#DDE8EE", 0.22), texture: "trees" },
    swamp: { color: mix(TERRAIN_COLORS.swamp, "#E6EEF2", 0.35), texture: "reeds" },
    mountain: { color: mix(TERRAIN_COLORS.mountain, "#E9EEF2", 0.3), texture: "snowPeaks" },
    sea: { color: mix(TERRAIN_COLORS.sea, "#35506B", 0.25), texture: "waves" },
    lake: { color: "#D6ECF6", texture: "ice" },
  },
  drought: {
    farmland: { color: mix(TERRAIN_COLORS.farmland, "#E0B565", 0.4), texture: "furrows" },
    hill: { color: mix(TERRAIN_COLORS.hill, "#D2B26E", 0.45), texture: "hills" },
    forest: { color: mix(TERRAIN_COLORS.forest, "#8C8A48", 0.4), texture: "trees" },
    swamp: { color: mix(TERRAIN_COLORS.swamp, "#A99B6C", 0.5), texture: "reeds" },
    mountain: { color: mix(TERRAIN_COLORS.mountain, "#B48C6A", 0.3), texture: "peaks" },
    lake: { color: "#CDB487", texture: "cracks" },
  },
};

export const terrainLook = (terrain: Terrain, atmosphere: MapAtmosphere = "default"): TerrainLook =>
  ATMOSPHERES[atmosphere][terrain] ?? BASE_LOOK[terrain];

export const TERRAIN_ICONS: Record<Terrain, IconName> = {
  farmland: "farmland",
  hill: "hill",
  forest: "forest",
  swamp: "swamp",
  mountain: "mountain",
  sea: "sea",
  lake: "lake",
};

export const FEATURE_ICONS: Record<Feature, IconName> = {
  mine: "mine",
  cave: "cave",
  magic: "magic",
  lostTribe: "lostTribe",
};

/** Background of the round badge drawn behind each feature icon on the map. */
export const FEATURE_COLORS: Record<Feature, string> = {
  mine: "#5C4A3D",
  cave: "#3B3240",
  magic: "#6A3FB5",
  lostTribe: "#8A5A2B",
};

/** Validated categorical palette (colour-blind separation and 3:1 contrast on light and dark). */
export const PLAYER_COLORS = ["#E5484D", "#3E63DD", "#D97706", "#8E4EC6", "#0E9384"] as const;

export const playerColor = (index: number): string => PLAYER_COLORS[index % PLAYER_COLORS.length];

/** Cheap stable hash in [0, 1): gives each region a slightly different shade so the map looks less flat. */
function shade(seed: number): number {
  let h = (seed + 1) * 2654435761;
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
}

/** Fill colour of a region: its terrain's colour, a touch lighter or darker. */
export function regionColor(terrain: Terrain, region: number, atmosphere: MapAtmosphere = "default"): string {
  const base = terrainLook(terrain, atmosphere).color;
  const s = shade(region);
  return s < 0.5 ? mix(base, "#000000", (0.5 - s) * 0.1) : mix(base, "#FFFFFF", (s - 0.5) * 0.14);
}
