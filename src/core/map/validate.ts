import { FEATURES, TERRAINS, type GameMap } from "./types";

/** Structural check of untrusted data (imported files, maps received from peers). */
export function isGameMap(data: unknown): data is GameMap {
  if (!data || typeof data !== "object") return false;
  const m = data as Partial<GameMap>;
  if (typeof m.name !== "string" || typeof m.id !== "string") return false;
  if (!Number.isInteger(m.cols) || !Number.isInteger(m.rows) || m.cols! < 3 || m.rows! < 3 || m.cols! > 40 || m.rows! > 40) return false;
  if (!Array.isArray(m.cells) || m.cells.length !== m.cols! * m.rows!) return false;
  if (!Array.isArray(m.regions) || m.regions.length > 200) return false;
  const regionCount = m.regions.length;
  if (!m.cells.every((c) => Number.isInteger(c) && c >= -1 && c < regionCount)) return false;
  return m.regions.every(
    (r) =>
      r &&
      (TERRAINS as readonly string[]).includes(r.terrain) &&
      Array.isArray(r.features) &&
      r.features.every((f) => (FEATURES as readonly string[]).includes(f))
  );
}
