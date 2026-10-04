import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/core/util/id";
import { STORAGE_PREFIX } from "./storage";

export type Language = "fr" | "en";

interface ProfileState {
  /** Stable id of this browser's player: lets the host give a reconnecting player their seat back. */
  playerId: string;
  name: string;
  language: Language;
  setName: (name: string) => void;
  setLanguage: (language: Language) => void;
}

const browserLanguage = (): Language => (navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en");

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      playerId: uid(),
      name: "",
      language: browserLanguage(),
      setName: (name) => set({ name: name.slice(0, 24) }),
      setLanguage: (language) => set({ language }),
    }),
    { name: `${STORAGE_PREFIX}profile`, version: 1 }
  )
);
