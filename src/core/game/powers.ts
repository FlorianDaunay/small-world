import type { ConquestContext, ScoreContext } from "./context";

export const POWER_IDS = [
  "alchemist",
  "merchant",
  "fortified",
  "forest",
  "hill",
  "swamp",
  "mounted",
  "commando",
  "seafaring",
  "flying",
  "wealthy",
  "pillaging",
  "underworld",
  "stout",
  "peaceful",
] as const;
export type PowerId = (typeof POWER_IDS)[number];

/** Maximum number of fortresses a player can build with the "fortified" power. */
export const MAX_FORTRESSES = 6;

/**
 * A special power: extra tokens plus optional hooks. Powers only work while their race is
 * active. Names and descriptions live in the i18n dictionaries (`power.<id>.name` / `.desc`).
 */
export interface PowerDef {
  id: PowerId;
  tokens: number;
  icon: string;
  discount?: (ctx: ConquestContext) => number;
  score?: (ctx: ScoreContext) => number;
  /** May conquer seas and lakes. */
  water?: boolean;
  /** May conquer any region, adjacent or not. */
  reachAnywhere?: boolean;
  /** Caves are adjacent to each other. */
  caveLinks?: boolean;
  /** May go into decline at the end of a turn in which it conquered. */
  lateDecline?: boolean;
  /** May build one fortress per turn. */
  fortresses?: boolean;
}

const terrainScore = (terrain: string) => (ctx: ScoreContext) =>
  ctx.regions.filter((i) => ctx.state.map.regions[i].terrain === terrain).length;
const isCurrent = (ctx: ScoreContext) => ctx.state.players[ctx.state.turn.playerIndex].id === ctx.player.id;

export const POWERS: Record<PowerId, PowerDef> = {
  alchemist: { id: "alchemist", tokens: 4, icon: "⚗️", score: () => 2 },
  merchant: { id: "merchant", tokens: 2, icon: "💰", score: (ctx) => ctx.regions.length },
  fortified: {
    id: "fortified",
    tokens: 3,
    icon: "🏰",
    fortresses: true,
    score: (ctx) => ctx.regions.filter((i) => ctx.state.regions[i].fortress).length,
  },
  forest: { id: "forest", tokens: 4, icon: "🌲", score: terrainScore("forest") },
  hill: { id: "hill", tokens: 4, icon: "⛰️", score: terrainScore("hill") },
  swamp: { id: "swamp", tokens: 4, icon: "🐸", score: terrainScore("swamp") },
  mounted: {
    id: "mounted",
    tokens: 5,
    icon: "🐎",
    discount: ({ state, region }) => (["hill", "farmland"].includes(state.map.regions[region].terrain) ? 1 : 0),
  },
  commando: { id: "commando", tokens: 4, icon: "🗡️", discount: () => 1 },
  seafaring: { id: "seafaring", tokens: 5, icon: "⛵", water: true },
  flying: { id: "flying", tokens: 5, icon: "🦅", reachAnywhere: true },
  wealthy: {
    id: "wealthy",
    tokens: 4,
    icon: "💎",
    score: (ctx) => (isCurrent(ctx) && ctx.player.active?.turnsPlayed === 0 ? 7 : 0),
  },
  pillaging: { id: "pillaging", tokens: 5, icon: "🔥", score: (ctx) => (isCurrent(ctx) ? ctx.state.turn.occupiedConquests : 0) },
  underworld: {
    id: "underworld",
    tokens: 5,
    icon: "🕳️",
    caveLinks: true,
    discount: ({ state, region }) => (state.map.regions[region].features.includes("cave") ? 1 : 0),
  },
  stout: { id: "stout", tokens: 4, icon: "🛡️", lateDecline: true },
  peaceful: {
    id: "peaceful",
    tokens: 3,
    icon: "🕊️",
    score: (ctx) => (isCurrent(ctx) && ctx.state.turn.attacked.length === 0 ? 3 : 0),
  },
};
