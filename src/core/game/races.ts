import { isWater } from "../map/types";
import type { ConquestContext, ScoreContext } from "./context";

export const RACE_IDS = [
  "humans",
  "elves",
  "dwarves",
  "orcs",
  "giants",
  "wizards",
  "ratmen",
  "tritons",
  "trolls",
  "skeletons",
  "halflings",
  "amazons",
] as const;
export type RaceId = (typeof RACE_IDS)[number];

/**
 * A race: its token count plus optional hooks the rules call. Names and descriptions live in
 * the i18n dictionaries (`race.<id>.name` / `.desc`). Adding a race = adding an entry here
 * and its two translations.
 */
export interface RaceDef {
  id: RaceId;
  tokens: number;
  /** Tokens saved on the cost of conquering a region. */
  discount?: (ctx: ConquestContext) => number;
  /** Bonus coins at the end of the turn. */
  score?: (ctx: ScoreContext) => number;
  /** `score` still applies once the race is in decline. */
  scoresInDecline?: boolean;
  /** The first conquest may target any region, not only the map's edge. */
  startAnywhere?: boolean;
  /** Loses no token when one of its regions is conquered. */
  noLosses?: boolean;
  /** Extra tokens available for conquests only, removed before redeployment. */
  conquestOnlyTokens?: number;
  /** Tokens gained before redeployment, from the turn's results. */
  reinforcements?: (occupiedConquests: number) => number;
  /** Marker left on each conquered region. */
  marks?: "lair" | "hole";
}

const count = (ctx: ScoreContext, test: (regionIndex: number) => boolean) => ctx.regions.filter(test).length;
const terrainOf = (ctx: ScoreContext, i: number) => ctx.state.map.regions[i];

export const RACES: Record<RaceId, RaceDef> = {
  humans: { id: "humans", tokens: 5, score: (ctx) => count(ctx, (i) => terrainOf(ctx, i).terrain === "farmland") },
  elves: { id: "elves", tokens: 6, noLosses: true },
  dwarves: {
    id: "dwarves",
    tokens: 3,
   
    score: (ctx) => count(ctx, (i) => terrainOf(ctx, i).features.includes("mine")),
    scoresInDecline: true,
  },
  orcs: { id: "orcs", tokens: 5, score: (ctx) => (ctx.state.players[ctx.state.turn.playerIndex].id === ctx.player.id ? ctx.state.turn.occupiedConquests : 0) },
  giants: {
    id: "giants",
    tokens: 6,
   
    discount: ({ state, topology, player, region }) =>
      topology.adjacency[region].some(
        (n) => state.map.regions[n].terrain === "mountain" && state.regions[n].owner === player.id && !state.regions[n].declined
      )
        ? 1
        : 0,
  },
  wizards: { id: "wizards", tokens: 5, score: (ctx) => count(ctx, (i) => terrainOf(ctx, i).features.includes("magic")) },
  ratmen: { id: "ratmen", tokens: 8 },
  tritons: {
    id: "tritons",
    tokens: 6,
   
    discount: ({ topology, region, state }) => (!isWater(state.map.regions[region].terrain) && topology.coastal[region] ? 1 : 0),
  },
  trolls: { id: "trolls", tokens: 5, marks: "lair" },
  skeletons: { id: "skeletons", tokens: 6, reinforcements: (occupied) => Math.floor(occupied / 2) },
  halflings: { id: "halflings", tokens: 6, startAnywhere: true, marks: "hole" },
  amazons: { id: "amazons", tokens: 6, conquestOnlyTokens: 4 },
};
