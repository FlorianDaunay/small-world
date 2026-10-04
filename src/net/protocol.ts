import type { GameAction, GameSettings, GameState } from "@/core/game";
import type { GameMap } from "@/core/map/types";

/** Bumped whenever messages change in an incompatible way: peers on other versions are refused. */
export const PROTOCOL_VERSION = 1;

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
}

export interface ChatMessage {
  from: string;
  name: string;
  text: string;
  at: number;
}

/**
 * Everything every peer knows about the room. The host owns it and broadcasts it after each
 * change; because everyone holds a full copy, any player can take over as host.
 */
export interface RoomSnapshot {
  code: string;
  /** Incremented on each host change; part of the host's peer id. */
  epoch: number;
  hostId: string;
  passwordHash: string;
  settings: GameSettings;
  /** Custom map chosen in the lobby (`null` for the built-in map). */
  customMap: GameMap | null;
  /** Join order: also the order in which players take over a lost host. */
  lobby: LobbyPlayer[];
  game: GameState | null;
  chat: ChatMessage[];
}

export type RejectReason = "password" | "full" | "started" | "kicked" | "version";

/** Messages a player sends to the host. */
export type ClientMessage =
  | { t: "hello"; version: number; playerId: string; name: string; passwordHash: string }
  | { t: "action"; action: GameAction }
  | { t: "chat"; text: string }
  | { t: "ping" };

/** Messages the host sends to players. */
export type HostMessage =
  | { t: "welcome"; playerId: string; room: RoomSnapshot }
  | { t: "reject"; reason: RejectReason }
  | { t: "room"; room: RoomSnapshot }
  | { t: "refused"; error: string }
  | { t: "ping" };

/** Both sides ping every second; a peer silent for this long (ms) is considered gone. */
export const HEARTBEAT_TIMEOUT = 8000;

export const MAX_CHAT = 50;
export const MAX_CHAT_LENGTH = 300;
