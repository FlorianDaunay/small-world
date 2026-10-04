import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultMaps } from "@/core/map/defaults";
import type { GameMap } from "@/core/map/types";
import { isGameMap } from "@/core/map/validate";
import { uid } from "@/core/util/id";
import { STORAGE_PREFIX } from "./storage";

interface MapsState {
  /** Maps created in the editor (built-in maps are not stored). */
  custom: GameMap[];
  save: (map: GameMap) => GameMap;
  remove: (id: string) => void;
  /** Adds an imported map under a fresh id; returns it, or `null` if the data is not a map. */
  importMap: (data: unknown) => GameMap | null;
}

export const useMaps = create<MapsState>()(
  persist(
    (set, get) => ({
      custom: [],
      save: (map) => {
        const saved = { ...map, builtIn: false, updatedAt: Date.now() };
        const exists = get().custom.some((m) => m.id === map.id);
        set({ custom: exists ? get().custom.map((m) => (m.id === map.id ? saved : m)) : [...get().custom, saved] });
        return saved;
      },
      remove: (id) => set({ custom: get().custom.filter((m) => m.id !== id) }),
      importMap: (data) => {
        if (!isGameMap(data)) return null;
        return get().save({ ...data, id: uid(), createdAt: Date.now() });
      },
    }),
    { name: `${STORAGE_PREFIX}maps`, version: 1 }
  )
);

/** Built-in maps first, then the user's. */
export const allMaps = (custom: GameMap[]): GameMap[] => [...defaultMaps(), ...custom];
