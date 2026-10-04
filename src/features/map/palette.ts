import type { Feature, Terrain } from "@/core/map/types";
import { mix } from "@/themes/color";
import type { IconName } from "@/ui/icons/Icon";

/**
 * Map colors are deliberately independent of the UI theme: a map must read like a map
 * (blue water, green forests) whatever the theme. Players get a fixed, distinct palette too.
 */
export const TERRAIN_COLORS: Record<Terrain, string> = {
  farmland: "#E6D58F",
  hill: "#B3CC7A",
  forest: "#4E8B4F",
  swamp: "#7E9277",
  mountain: "#A0948A",
  sea: "#3F7FC4",
  lake: "#78B4E3",
};

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

/** Cheap stable hash: gives each cell a slightly different shade so terrain looks less flat. */
function shade(cell: number): number {
  let h = (cell + 1) * 2654435761;
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
}

export function cellColor(terrain: Terrain, cell: number): string {
  const s = shade(cell);
  return s < 0.5 ? mix(TERRAIN_COLORS[terrain], "#000000", (0.5 - s) * 0.12) : mix(TERRAIN_COLORS[terrain], "#FFFFFF", (s - 0.5) * 0.16);
}
