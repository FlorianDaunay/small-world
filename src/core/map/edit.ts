import type { Feature, GameMap, Terrain } from "./types";

/** Pure editing operations used by the map editor. Each returns a new map. */

export function blankMap(id: string, name: string, cols: number, rows: number): GameMap {
  const now = Date.now();
  return { id, name, cols, rows, cells: new Array(cols * rows).fill(-1), regions: [], createdAt: now, updatedAt: now };
}

/** Changes the grid size, keeping every cell that still fits. */
export function resizeMap(map: GameMap, cols: number, rows: number): GameMap {
  const cells = new Array<number>(cols * rows).fill(-1);
  for (let r = 0; r < Math.min(rows, map.rows); r++) {
    for (let c = 0; c < Math.min(cols, map.cols); c++) cells[r * cols + c] = map.cells[r * map.cols + c];
  }
  return compactMap({ ...map, cols, rows, cells });
}

export function paintCell(map: GameMap, cell: number, region: number): GameMap {
  if (map.cells[cell] === region) return map;
  const cells = [...map.cells];
  cells[cell] = region;
  return { ...map, cells };
}

export function addRegion(map: GameMap, terrain: Terrain = "farmland"): { map: GameMap; region: number } {
  return { map: { ...map, regions: [...map.regions, { terrain, features: [] }] }, region: map.regions.length };
}

export function setTerrain(map: GameMap, region: number, terrain: Terrain): GameMap {
  return { ...map, regions: map.regions.map((r, i) => (i === region ? { ...r, terrain } : r)) };
}

export function toggleFeature(map: GameMap, region: number, feature: Feature): GameMap {
  return {
    ...map,
    regions: map.regions.map((r, i) =>
      i === region ? { ...r, features: r.features.includes(feature) ? r.features.filter((f) => f !== feature) : [...r.features, feature] } : r
    ),
  };
}

export function removeRegion(map: GameMap, region: number): GameMap {
  return compactMap({ ...map, cells: map.cells.map((c) => (c === region ? -1 : c)) });
}

/** Drops regions without cells and renumbers the others (keeps saved maps tidy). */
export function compactMap(map: GameMap): GameMap {
  const used = new Set(map.cells.filter((c) => c >= 0));
  const remap = new Map<number, number>();
  const regions = map.regions.filter((_, i) => {
    if (!used.has(i)) return false;
    remap.set(i, remap.size);
    return true;
  });
  return { ...map, regions, cells: map.cells.map((c) => (c >= 0 ? remap.get(c) ?? -1 : -1)) };
}
