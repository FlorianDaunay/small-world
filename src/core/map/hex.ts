/**
 * Geometry of the pointy-top "odd-r" hexagon grid. Coordinates are in hex-size units
 * (radius = 1); the renderer scales them.
 */

export const SQRT3 = Math.sqrt(3);

/** Neighbour offsets `[dCol, dRow]`, in the same order as the hexagon's edges (E, SE, SW, W, NW, NE). */
const EVEN_ROW: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
const ODD_ROW: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];

/** The six neighbour cell indices of a cell, in edge order; `-1` when outside the grid. */
export function neighbours(index: number, cols: number, rows: number): number[] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const offsets = row % 2 === 0 ? EVEN_ROW : ODD_ROW;
  return offsets.map(([dc, dr]) => {
    const c = col + dc;
    const r = row + dr;
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  });
}

export function cellCenter(index: number, cols: number): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: SQRT3 * (col + 0.5 * (row % 2)) + SQRT3 / 2, y: 1.5 * row + 1 };
}

/** Corner `i` (0..5) of a hexagon; edge `i` runs from corner `i` to corner `i + 1`. */
export function hexCorner(cx: number, cy: number, i: number, size = 1): { x: number; y: number } {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
}

export function hexPoints(cx: number, cy: number, size = 1): string {
  return Array.from({ length: 6 }, (_, i) => {
    const p = hexCorner(cx, cy, i, size);
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }).join(" ");
}

/** Pixel size of the whole grid, in hex units. */
export function gridSize(cols: number, rows: number): { width: number; height: number } {
  return { width: SQRT3 * cols + SQRT3 / 2, height: 1.5 * (rows - 1) + 2 };
}
