import type { GameMap } from "../map/types";
import type { PowerId } from "./powers";
import type { RaceId } from "./races";

export interface GameSettings {
  /** Seats in the lobby (2 to 5). */
  maxPlayers: number;
  /** Number of game turns; the game ends after the last player finishes the last turn. */
  turns: number;
  /** Time limit per player turn, in seconds (0 = unlimited). */
  turnSeconds: number;
  /** Allows a last, random conquest with the reinforcement die when tokens run short. */
  reinforcementDie: boolean;
  /** `"default"` for the built-in map matching the player count, or a custom map id. */
  mapId: string;
}

/** A race/power pair offered in the market, with the coins players left on it. */
export interface Combo {
  race: RaceId;
  power: PowerId;
  coins: number;
}

export interface RegionState {
  /** Player holding the region, or `null`. */
  owner: string | null;
  tokens: number;
  /** The tokens belong to the owner's race in decline. */
  declined: boolean;
  /** A neutral tribe still guards the region (counts as one defender). */
  lostTribe: boolean;
  fortress: boolean;
  /** Troll lair: +1 defence, survives the decline. */
  lair: boolean;
  /** Halfling hole: region immune while the halflings are active. */
  hole: boolean;
}

export interface ActiveRace {
  race: RaceId;
  power: PowerId;
  /** Tokens in hand, not on the map. */
  hand: number;
  /** Turns already played with this race (0 during the turn it was picked). */
  turnsPlayed: number;
  holesLeft: number;
}

/** Running totals kept for the end-of-game statistics. */
export interface PlayerStats {
  /** Regions conquered (any kind). */
  conquests: number;
  /** Regions taken from other players. */
  attacks: number;
  /** Lost tribes driven out. */
  tribes: number;
  regionsLost: number;
  tokensLost: number;
  rolls: number;
  rollsWon: number;
  declines: number;
  /** Coins paid to skip combos in the market, and coins picked up from it. */
  coinsSpent: number;
  coinsCollected: number;
  /** Coins earned from held regions, and from race/power bonuses. */
  earnedRegions: number;
  earnedBonus: number;
  /** Most regions held at the end of one of the player's turns. */
  peakRegions: number;
  /** Every combo the player picked, in order. */
  races: { race: RaceId; power: PowerId; turn: number }[];
  /** Coins after each of the player's turns. */
  coinsTimeline: number[];
}

export interface PlayerState {
  id: string;
  name: string;
  /** Index into the player palette. */
  color: number;
  coins: number;
  connected: boolean;
  active: ActiveRace | null;
  declined: { race: RaceId; power: PowerId } | null;
  /** Coins earned per turn, for the end-of-game summary. */
  history: number[];
  stats: PlayerStats;
}

export type Phase = "pick" | "conquer" | "redeploy" | "finished";

export interface TurnState {
  /** 1-based game turn. */
  number: number;
  /** Index into `players` of whoever is playing. */
  playerIndex: number;
  phase: Phase;
  pickedThisTurn: boolean;
  /** Regions conquered this turn. */
  conquests: number;
  /** Conquered regions that were not empty (other players or lost tribes). */
  occupiedConquests: number;
  /** Players the current player took a region from this turn. */
  attacked: string[];
  fortressPlaced: boolean;
  /** Epoch ms when the turn times out, or `null` without time limit. */
  deadline: number | null;
}

export interface LogEntry {
  /** i18n key under `log.` */
  key: string;
  params?: Record<string, string | number>;
  at: number;
}

export interface GameState {
  id: string;
  /** Incremented by every accepted action: lets peers discard stale updates. */
  version: number;
  createdAt: number;
  updatedAt: number;
  settings: GameSettings;
  map: GameMap;
  regions: RegionState[];
  players: PlayerState[];
  market: Combo[];
  racePool: RaceId[];
  powerPool: PowerId[];
  rngState: number;
  turn: TurnState;
  /** Result of the last reinforcement die roll, for display. */
  lastRoll: { player: string; value: number; success: boolean } | null;
  log: LogEntry[];
  winners: string[];
}

/** Everything a player (or the host on their behalf) can ask the game to do. */
export type GameAction =
  | { type: "pick"; index: number }
  | { type: "conquer"; region: number }
  | { type: "roll"; region: number }
  | { type: "abandon"; region: number }
  | { type: "decline" }
  | { type: "endConquest" }
  | { type: "deploy"; region: number; delta: 1 | -1 }
  | { type: "fortress"; region: number }
  | { type: "endTurn" };

/** Actions only the host issues. */
export type SystemAction =
  | { type: "timeout" }
  | { type: "setConnected"; playerId: string; connected: boolean }
  | { type: "rename"; playerId: string; name: string };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };
