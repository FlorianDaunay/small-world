import { MAP_PRESETS, generateMap } from "./generator";
import type { GameMap } from "./types";

/** Fixed seeds: the built-in maps are generated, but always identical for everyone. */
const SEEDS: Record<number, number> = { 2: 20240102, 3: 20240103, 4: 20240104, 5: 20240105 };

const cache = new Map<number, GameMap>();

export const defaultMapId = (players: number) => `default-${players}p`;

/** The built-in map tuned for a player count (2 to 5). */
export function defaultMap(players: number): GameMap {
  const count = Math.min(5, Math.max(2, players));
  let map = cache.get(count);
  if (!map) {
    map = { ...generateMap({ ...MAP_PRESETS[count], seed: SEEDS[count], id: defaultMapId(count), name: `default-${count}` }), builtIn: true, createdAt: 0, updatedAt: 0 };
    cache.set(count, map);
  }
  return map;
}

export const defaultMaps = (): GameMap[] => [2, 3, 4, 5].map(defaultMap);
