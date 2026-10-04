import { cellCenter, neighbours } from "./hex";
import { isWater, type GameMap } from "./types";

/** Everything derived from a map's cells that the rules and the renderer need. */
export interface MapTopology {
  regionCount: number;
  /** Cells of each region. */
  cellsOf: number[][];
  /** Region indices adjacent to each region (sorted, no duplicates). */
  adjacency: number[][];
  /** Region touches the outside of the map (grid border or an empty cell). */
  edge: boolean[];
  /** Land region next to a sea or a lake. */
  coastal: boolean[];
  /** Where to draw the region's label: the centre of its most central cell. */
  anchor: { x: number; y: number }[];
}

export function buildTopology(map: GameMap): MapTopology {
  const { cols, rows, cells } = map;
  const regionCount = map.regions.length;
  const cellsOf: number[][] = Array.from({ length: regionCount }, () => []);
  const adjacent: Set<number>[] = Array.from({ length: regionCount }, () => new Set());
  const edge = new Array<boolean>(regionCount).fill(false);

  cells.forEach((region, index) => {
    if (region < 0 || region >= regionCount) return;
    cellsOf[region].push(index);
    for (const n of neighbours(index, cols, rows)) {
      const other = n < 0 ? -1 : cells[n];
      if (other < 0) edge[region] = true;
      else if (other !== region) adjacent[region].add(other);
    }
  });

  const adjacency = adjacent.map((set) => [...set].sort((a, b) => a - b));
  const coastal = map.regions.map(
    (r, i) => !isWater(r.terrain) && adjacency[i].some((n) => isWater(map.regions[n].terrain))
  );

  const anchor = cellsOf.map((list) => {
    if (list.length === 0) return { x: 0, y: 0 };
    const points = list.map((c) => cellCenter(c, cols));
    const mx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const my = points.reduce((s, p) => s + p.y, 0) / points.length;
    return points.reduce((best, p) => ((p.x - mx) ** 2 + (p.y - my) ** 2 < (best.x - mx) ** 2 + (best.y - my) ** 2 ? p : best));
  });

  return { regionCount, cellsOf, adjacency, edge, coastal, anchor };
}

/** Connected groups of the given regions (adjacency restricted to the set). */
export function connectedGroups(topology: MapTopology, include: (region: number) => boolean): number[][] {
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (let start = 0; start < topology.regionCount; start++) {
    if (seen.has(start) || !include(start) || topology.cellsOf[start].length === 0) continue;
    const group: number[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const r = stack.pop()!;
      group.push(r);
      for (const n of topology.adjacency[r]) {
        if (!seen.has(n) && include(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
