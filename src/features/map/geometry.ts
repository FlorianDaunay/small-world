import { cellCenter, hexCorner, neighbours } from "@/core/map/hex";
import type { MapTopology } from "@/core/map/topology";
import { isWater, type GameMap } from "@/core/map/types";

/** SVG paths derived from a map, computed once per map and reused by every render. */
export interface MapGeometry {
  /** Lines between two different regions (each edge once). */
  borders: string;
  /** Edges of the map against the outside. */
  outline: string;
  /** Edges between land and water. */
  coast: string;
  /** Edges between two cells of the same region (the faint hexagon grid). */
  grid: string;
  /** Outline of each region, for highlights. */
  outlines: string[];
  /** Filled shape of each region (its hexagons). */
  fills: string[];
}

const fmt = (n: number) => n.toFixed(3);

function edgePath(cell: number, edge: number, cols: number): string {
  const { x, y } = cellCenter(cell, cols);
  const a = hexCorner(x, y, edge);
  const b = hexCorner(x, y, (edge + 1) % 6);
  return `M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`;
}

function hexPath(cell: number, cols: number): string {
  const { x, y } = cellCenter(cell, cols);
  // A hair larger than the cell, so that neighbouring shapes overlap instead of leaving seams.
  return `${Array.from({ length: 6 }, (_, i) => {
    const p = hexCorner(x, y, i, 1.004);
    return `${i ? "L" : "M"}${fmt(p.x)} ${fmt(p.y)}`;
  }).join("")}Z`;
}

export function buildGeometry(map: GameMap, topology: MapTopology): MapGeometry {
  const { cols, rows, cells } = map;
  let borders = "";
  let outline = "";
  let coast = "";
  let grid = "";
  const outlines = Array.from({ length: topology.regionCount }, () => "");
  const fills = Array.from({ length: topology.regionCount }, () => "");
  const water = (region: number) => isWater(map.regions[region]?.terrain ?? "sea");
  cells.forEach((region, cell) => {
    if (region < 0 || region >= topology.regionCount) return;
    fills[region] += hexPath(cell, cols);
    neighbours(cell, cols, rows).forEach((n, edge) => {
      const other = n < 0 ? -1 : cells[n];
      // Each shared edge is drawn once, from the cell with the lower index.
      if (other === region) {
        if (n > cell) grid += edgePath(cell, edge, cols);
        return;
      }
      const path = edgePath(cell, edge, cols);
      outlines[region] += path;
      if (other < 0) outline += path;
      else if (n > cell) {
        borders += path;
        if (water(region) !== water(other)) coast += path;
      }
    });
  });
  return { borders, outline, coast, grid, outlines, fills };
}

const cache = new WeakMap<MapTopology, MapGeometry>();

/** Memoised geometry: one per topology (itself memoised per map). */
export function geometryOf(map: GameMap, topology: MapTopology): MapGeometry {
  let geometry = cache.get(topology);
  if (!geometry) {
    geometry = buildGeometry(map, topology);
    cache.set(topology, geometry);
  }
  return geometry;
}
