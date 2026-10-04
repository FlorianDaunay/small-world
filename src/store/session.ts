import { create } from "zustand";
import type { GameAction } from "@/core/game";
import { hashPassword } from "@/net/crypto";
import { NetError } from "@/net/peer";
import { Session, type HostOptions, type SessionView } from "@/net/session";
import { useProfile } from "./profile";
import { useSaves } from "./saves";

interface SessionState {
  session: Session | null;
  view: SessionView | null;
  /** Password typed by the local player, kept to save the game with it. */
  password: string;
  busy: boolean;
  /** Error code of the last failed host/join attempt. */
  error: string | null;
  host: (options: Omit<HostOptions, "playerId" | "name" | "passwordHash">) => Promise<boolean>;
  join: (code: string, password: string) => Promise<boolean>;
  dispatch: (action: GameAction) => void;
  leave: () => void;
  clearError: () => void;
}

const errorCode = (error: unknown) => (error instanceof NetError ? error.code : "unknown");

/** Glue between the network session and React; also auto-saves the game on every change. */
export const useSession = create<SessionState>()((set, get) => {
  const adopt = (session: Session, password: string) => {
    get().session?.leave();
    set({ session, view: session.current, password, busy: false, error: null });
    session.subscribe((view) => {
      if (get().session !== session) return;
      set({ view });
      const game = view.room.game;
      if (game && view.status !== "closed") useSaves.getState().record({ id: game.id, code: view.room.code, password, game });
    });
  };

  return {
    session: null,
    view: null,
    password: "",
    busy: false,
    error: null,

    host: async (options) => {
      const { playerId, name } = useProfile.getState();
      set({ busy: true, error: null });
      try {
        const passwordHash = await hashPassword(options.password);
        adopt(await Session.host({ ...options, playerId, name, passwordHash }), options.password);
        return true;
      } catch (error) {
        set({ busy: false, error: errorCode(error) });
        return false;
      }
    },

    join: async (code, password) => {
      const { playerId, name } = useProfile.getState();
      set({ busy: true, error: null });
      try {
        const passwordHash = await hashPassword(password);
        adopt(await Session.join({ code, playerId, name, passwordHash }), password);
        return true;
      } catch (error) {
        set({ busy: false, error: errorCode(error) });
        return false;
      }
    },

    dispatch: (action) => get().session?.dispatch(action),

    leave: () => {
      get().session?.leave();
      set({ session: null, view: null });
    },

    clearError: () => set({ error: null }),
  };
});

// Closing the tab closes the connections right away, so the others notice (and a new host
// takes over) immediately instead of waiting for the heartbeat timeout.
window.addEventListener("pagehide", () => useSession.getState().session?.leave());
