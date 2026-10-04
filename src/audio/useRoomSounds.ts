import { useEffect, useRef } from "react";
import type { LogEntry } from "@/core/game";
import { SYSTEM_SENDER } from "@/net/session";
import { useSession } from "@/store/session";
import { playSound, type SoundName } from "./sound";

const sameEntry = (a: LogEntry, b: LogEntry) => a.at === b.at && a.key === b.key && JSON.stringify(a.params) === JSON.stringify(b.params);

/** Log entries appended since `previous` (the log is capped, so match on the last known entry). */
function newEntries(previous: LogEntry[], next: LogEntry[]): LogEntry[] {
  if (!previous.length) return [];
  const last = previous[previous.length - 1];
  for (let i = next.length - 1; i >= 0; i--) if (sameEntry(next[i], last)) return next.slice(i + 1);
  return [];
}

/**
 * Turns room changes into sound effects: game log entries, chat messages and lobby arrivals.
 * Mounted once by the room page, so it works for the lobby and the game alike.
 */
export function useRoomSounds() {
  const view = useSession((s) => s.view);
  const previous = useRef<{ log: LogEntry[]; chat: number; lobby: number } | null>(null);

  useEffect(() => {
    if (!view) return;
    const { room, me } = view;
    const log = room.game?.log ?? [];
    const lobby = room.lobby.filter((p) => p.connected).length;
    const before = previous.current;
    previous.current = { log, chat: room.chat.length, lobby };
    if (!before) return;

    const sounds: SoundName[] = [];
    const myName = room.game?.players.find((p) => p.id === me)?.name;
    for (const entry of newEntries(before.log, log)) {
      const actor = entry.params?.player;
      switch (entry.key) {
        case "picked":
          sounds.push("pick");
          break;
        case "conquered":
        case "conqueredTribe":
          sounds.push("conquer");
          break;
        case "conqueredFrom":
          sounds.push("attack");
          break;
        case "rollWon":
        case "rollLost":
          sounds.push(entry.key);
          break;
        case "declined":
          sounds.push("decline");
          break;
        case "scored":
          if (actor === myName) sounds.push("coin");
          break;
        case "turnStarted":
          sounds.push(actor === myName ? "yourTurn" : "turn");
          break;
        case "playerLeft":
          sounds.push("leave");
          break;
        case "playerBack":
          sounds.push("join");
          break;
        case "gameOver":
          sounds.push("victory");
          break;
      }
    }
    if (!room.game && lobby > before.lobby) sounds.push("join");
    if (!room.game && lobby < before.lobby) sounds.push("leave");
    const lastChat = room.chat[room.chat.length - 1];
    if (room.chat.length !== before.chat && lastChat && lastChat.from !== me && lastChat.from !== SYSTEM_SENDER) sounds.push("chat");

    // A burst of events (e.g. end of turn) is spread out instead of played on top of each other.
    sounds.slice(0, 4).forEach((sound, i) => playSound(sound, i * 220));
  }, [view]);
}
