import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState } from "@/core/game";
import { isGameMap } from "@/core/map/validate";
import { STORAGE_PREFIX } from "./storage";

/** A game kept on this device so it can be resumed later (by any of its players). */
export interface SaveEntry {
  id: string;
  savedAt: number;
  code: string;
  password: string;
  game: GameState;
}

const MAX_SAVES = 10;

interface SavesState {
  saves: SaveEntry[];
  record: (entry: Omit<SaveEntry, "savedAt">) => void;
  remove: (id: string) => void;
  /** Adds a save from an exported file; returns it, or `null` if the file is not a save. */
  importSave: (data: unknown) => SaveEntry | null;
}

function isSave(data: unknown): data is SaveEntry {
  const s = data as Partial<SaveEntry> | null;
  return !!s && typeof s.id === "string" && !!s.game && Array.isArray(s.game.players) && Array.isArray(s.game.regions) && isGameMap(s.game.map);
}

export const useSaves = create<SavesState>()(
  persist(
    (set, get) => ({
      saves: [],
      record: (entry) => {
        const saved: SaveEntry = { ...entry, savedAt: Date.now() };
        const others = get().saves.filter((s) => s.id !== entry.id);
        set({ saves: [saved, ...others].slice(0, MAX_SAVES) });
      },
      remove: (id) => set({ saves: get().saves.filter((s) => s.id !== id) }),
      importSave: (data) => {
        if (!isSave(data)) return null;
        get().record({ id: data.id, code: data.code ?? "", password: data.password ?? "", game: data.game });
        return get().saves[0];
      },
    }),
    { name: `${STORAGE_PREFIX}saves`, version: 1 }
  )
);
