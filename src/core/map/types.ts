/** Terrains a region can have. `sea` and `lake` are water: nobody can normally hold them. */
export const TERRAINS = ["farmland", "hill", "forest", "swamp", "mountain", "sea", "lake"] as const;
export type Terrain = (typeof TERRAINS)[number];

export const LAND_TERRAINS = ["farmland", "hill", "forest", "swamp", "mountain"] as const satisfies readonly Terrain[];
export const WATER_TERRAINS = ["sea", "lake"] as const satisfies readonly Terrain[];

/** Special places printed on a region. */
export const FEATURES = ["mine", "cave", "magic", "lostTribe"] as const;
export type Feature = (typeof FEATURES)[number];

export interface RegionDef {
  terrain: Terrain;
  features: Feature[];
}

/**
 * A map is a grid of pointy-top hexagons (odd rows shifted right). Each cell belongs to a
 * region (index into `regions`) or to nothing (`-1`, outside the map). Adjacency, borders
 * and positions are all derived from the cells, so a map stays a small, serialisable object.
 */
export interface GameMap {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** Row-major, `cols * rows` entries. */
  cells: number[];
  regions: RegionDef[];
  /** Built-in maps cannot be edited or deleted (they can be duplicated). */
  builtIn?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const isWater = (terrain: Terrain): boolean => terrain === "sea" || terrain === "lake";
