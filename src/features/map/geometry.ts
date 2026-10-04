import { cellCenter, hexCorner, neighbours } from "@/core/map/hex";
import type { MapTopology } from "@/core/map/topology";
import type { GameMap } from "@/core/map/types";

/** SVG paths derived from a map, computed once per map and reused by every render. */
export interface MapGeometry {
  /** Lines between two different regions (each edge once). */
  borders: string;
  /** Outline of each region, for highlights. */
  outlines: string[];
}

const fmt = (n: number) => n.toFixed(3);

function edgePath(cell: number, edge: number, cols: number): string {
  const { x, y } = cellCenter(cell, cols);
  const a = hexCorner(x, y, edge);
  const b = hexCorner(x, y, (edge + 1) % 6);
  return `M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`;
}

export function buildGeometry(map: GameMap, topology: MapTopology): MapGeometry {
  const { cols, rows, cells } = map;
  let borders = "";
  const outlines = Array.from({ length: topology.regionCount }, () => "");
  cells.forEach((region, cell) => {
    if (region < 0) return;
    neighbours(cell, cols, rows).forEach((n, edge) => {
      const other = n < 0 ? -1 : cells[n];
      if (other === region) return;
      const path = edgePath(cell, edge, cols);
      outlines[region] += path;
      if (other < 0 || n > cell) borders += path;
    });
  });
  return { borders, outlines };
}
