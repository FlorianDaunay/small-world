import type { MapTopology } from "../map/topology";
import { isWater } from "../map/types";
import { POWERS } from "./powers";
import { RACES } from "./races";
import type { GameState, PlayerState } from "./types";

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

/** Defence of a region before any attacker discount: what the attacker has to beat. */
export function regionDefence(state: GameState, region: number): number {
  const r = state.regions[region];
  const def = state.map.regions[region];
  return (
    r.tokens +
    (r.lostTribe ? 1 : 0) +
    (def.terrain === "mountain" ? 1 : 0) +
    (r.fortress ? 1 : 0) +
    (r.lair ? 1 : 0)
  );
}

/** Tokens the current player needs to conquer `region` (never below 1). */
export function conquestCost(state: GameState, topology: MapTopology, region: number): number {
  const player = currentPlayer(state);
  const active = player.active;
  let cost = 2 + regionDefence(state, region);
  if (active) {
    const ctx = { state, topology, player, region };
    cost -= RACES[active.race].discount?.(ctx) ?? 0;
    cost -= POWERS[active.power].discount?.(ctx) ?? 0;
  }
  return Math.max(1, cost);
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
  if (isWater(def.terrain) && !power.water) return "water";
  if (target.hole && target.owner && target.owner !== player.id) {
    const owner = state.players.find((p) => p.id === target.owner);
    if (owner?.active?.race === "halflings" && !target.declined) return "immune";
  }
  if (active.hand <= 0) return "noTokens";

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

/** Coins the player would earn if the turn ended now, split by source. */
export function scoreBreakdown(state: GameState, player: PlayerState): { regions: number; race: number; power: number; total: number } {
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
  return { regions, race, power, total: regions + race + power };
}

/** Players with the most coins (several on a tie). */
export function leaders(state: GameState): string[] {
  const best = Math.max(...state.players.map((p) => p.coins));
  return state.players.filter((p) => p.coins === best).map((p) => p.id);
}
