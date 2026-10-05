import type { MapTopology } from "../map/topology";
import { isWater } from "../map/types";
import { EVENTS } from "./events";
import { EXTENSIONS } from "./extensions";
import { POWERS } from "./powers";
import { RACES, minTokensOf } from "./races";
import type { GameState, PlayerState } from "./types";
import type { WorldRules } from "./world";

/** Faces of the reinforcement die rolled for a last conquest. */
export const DIE_FACES = [0, 0, 0, 1, 2, 3] as const;
export const MARKET_SIZE = 6;
export const STARTING_COINS = 5;

/** Default number of turns for a player count (as in the board game). */
export const defaultTurns = (players: number): number => (players <= 3 ? 10 : players === 4 ? 9 : 8);

export const currentPlayer = (state: GameState): PlayerState => state.players[state.turn.playerIndex];

/** Regions held by a player's active (or declined) race. */
export function regionsOf(state: GameState, playerId: string, declined: boolean): number[] {
  const result: number[] = [];
  state.regions.forEach((r, i) => {
    if (r.owner === playerId && r.declined === declined) result.push(i);
  });
  return result;
}

/** Rule sets that apply to everyone right now: the chosen extensions' and the current event's. */
export function worldRules(state: GameState): WorldRules[] {
  const rules: WorldRules[] = [];
  for (const id of state.settings.extensions) {
    const extra = EXTENSIONS[id]?.rules;
    if (extra) rules.push(extra);
  }
  if (state.event) rules.push(EVENTS[state.event]);
  return rules;
}

const sumOf = <C>(rules: WorldRules[], pick: (r: WorldRules) => ((ctx: C) => number) | undefined, ctx: C) =>
  rules.reduce((sum, r) => sum + (pick(r)?.(ctx) ?? 0), 0);

/** Lakes are land when an extension says so (frozen or dried up). */
export const landLakes = (state: GameState): boolean => worldRules(state).some((r) => r.landLakes);

/** Whether a region is water nobody can normally enter. */
export function isWaterRegion(state: GameState, region: number): boolean {
  const terrain = state.map.regions[region].terrain;
  return isWater(terrain) && !(terrain === "lake" && landLakes(state));
}

/** Defence of a region before any attacker discount: what the attacker has to beat. */
export function regionDefence(state: GameState, region: number): number {
  const r = state.regions[region];
  const def = state.map.regions[region];
  const ctx = { state, region };
  const holder = r.owner && !r.declined ? state.players.find((p) => p.id === r.owner)?.active : null;
  const own = holder ? (RACES[holder.race].defence?.(ctx) ?? 0) : 0;
  const base = r.tokens + (r.lostTribe ? 1 : 0) + (def.terrain === "mountain" ? 1 : 0) + (r.fortress ? 1 : 0) + (r.lair ? 1 : 0);
  return Math.max(0, base + own + sumOf(worldRules(state), (w) => w.defence, ctx));
}

/** Tokens the current player needs to conquer `region` (never below 1). */
export function conquestCost(state: GameState, topology: MapTopology, region: number): number {
  const player = currentPlayer(state);
  const active = player.active;
  const ctx = { state, topology, player, region };
  let cost = 2 + regionDefence(state, region) - sumOf(worldRules(state), (w) => w.discount, ctx);
  if (active) {
    cost -= RACES[active.race].discount?.(ctx) ?? 0;
    cost -= POWERS[active.power].discount?.(ctx) ?? 0;
  }
  return Math.max(active ? minTokensOf(active.race) : 1, cost);
}

export type ConquestBlock =
  | "notYourTurn"
  | "wrongPhase"
  | "noRace"
  | "alreadyYours"
  | "water"
  | "notReachable"
  | "notEdge"
  | "immune"
  | "noTokens";

/** Why the current player cannot attack `region`, or `null` when they can. */
export function conquestBlock(state: GameState, topology: MapTopology, region: number): ConquestBlock | null {
  if (state.turn.phase !== "conquer") return "wrongPhase";
  const player = currentPlayer(state);
  const active = player.active;
  if (!active) return "noRace";
  const target = state.regions[region];
  const def = state.map.regions[region];
  if (target.owner === player.id && !target.declined) return "alreadyYours";
  const race = RACES[active.race];
  const power = POWERS[active.power];
  if (isWaterRegion(state, region) && !power.water) return "water";
  if (target.hole && target.owner && target.owner !== player.id) {
    const owner = state.players.find((p) => p.id === target.owner);
    if (owner?.active?.race === "halflings" && !target.declined) return "immune";
  }
  if (active.hand < minTokensOf(active.race)) return "noTokens";

  const own = regionsOf(state, player.id, false);
  if (power.reachAnywhere) return null;
  if (own.length === 0) {
    if (race.startAnywhere) return null;
    return topology.edge[region] ? null : "notEdge";
  }
  if (own.some((r) => topology.adjacency[r].includes(region))) return null;
  if (power.caveLinks && def.features.includes("cave") && own.some((r) => state.map.regions[r].features.includes("cave"))) return null;
  return "notReachable";
}

/** Whether the current player can go into decline right now. */
export function canDecline(state: GameState): boolean {
  const player = currentPlayer(state);
  const { turn } = state;
  if (!player.active || turn.pickedThisTurn) return false;
  if (turn.phase === "conquer" && turn.conquests === 0) return true;
  return turn.phase === "redeploy" && POWERS[player.active.power].lateDecline === true;
}

export interface ScoreBreakdown {
  /** One coin per region held, active or in decline. */
  regions: number;
  race: number;
  power: number;
  /** Extensions and events (may be negative). */
  world: number;
  total: number;
}

/** Coins the player would earn if the turn ended now, split by source. */
export function scoreBreakdown(state: GameState, player: PlayerState): ScoreBreakdown {
  const active = regionsOf(state, player.id, false);
  const declined = regionsOf(state, player.id, true);
  let race = 0;
  let power = 0;
  if (player.active) {
    const ctx = { state, player, regions: active };
    race += RACES[player.active.race].score?.(ctx) ?? 0;
    power += POWERS[player.active.power].score?.(ctx) ?? 0;
  }
  if (player.declined && RACES[player.declined.race].scoresInDecline) {
    race += RACES[player.declined.race].score?.({ state, player, regions: declined }) ?? 0;
  }
  const regions = active.length + declined.length;
  const world = sumOf(worldRules(state), (w) => w.score, { state, player, regions: [...active, ...declined] });
  return { regions, race, power, world, total: Math.max(0, regions + race + power + world) };
}

/** Players with the most coins (several on a tie). */
export function leaders(state: GameState): string[] {
  const best = Math.max(...state.players.map((p) => p.coins));
  return state.players.filter((p) => p.coins === best).map((p) => p.id);
}
