import { buildTopology, type MapTopology } from "./topology";
import type { GameMap } from "./types";

const cache = new Map<string, MapTopology>();

/** Memoised topology: game states are cloned on every action, the map itself rarely changes. */
export function topologyOf(map: GameMap): MapTopology {
  const key = `${map.id}:${map.updatedAt}:${map.cols}x${map.rows}:${map.regions.length}`;
  let topology = cache.get(key);
  if (!topology) {
    topology = buildTopology(map);
    if (cache.size > 32) cache.clear();
    cache.set(key, topology);
  }
  return topology;
}
