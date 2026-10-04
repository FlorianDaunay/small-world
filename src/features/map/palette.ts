import type { Feature, Terrain } from "@/core/map/types";
import { mix } from "@/themes/color";

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

export const TERRAIN_ICONS: Record<Terrain, string> = {
  farmland: "🌾",
  hill: "⛰️",
  forest: "🌲",
  swamp: "🪷",
  mountain: "🏔️",
  sea: "🌊",
  lake: "💧",
};

export const FEATURE_ICONS: Record<Feature, string> = {
  mine: "⚒️",
  cave: "🕳️",
  magic: "✨",
  lostTribe: "🛖",
};

export const PLAYER_COLORS = ["#E5484D", "#3E63DD", "#F5A524", "#8E4EC6", "#12A594"] as const;

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
