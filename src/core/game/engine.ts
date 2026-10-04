import { topologyOf } from "../map/cache";
import type { GameMap } from "../map/types";
import { createRng } from "../util/rng";
import { emptyStats } from "./migrate";
import { MAX_FORTRESSES, POWERS, POWER_IDS } from "./powers";
import { RACES, RACE_IDS } from "./races";
import {
  DIE_FACES,
  MARKET_SIZE,
  STARTING_COINS,
  canDecline,
  conquestBlock,
  conquestCost,
  currentPlayer,
  leaders,
  regionsOf,
  scoreBreakdown,
} from "./rules";
import type { ActionResult, GameAction, GameSettings, GameState, PlayerState, SystemAction, TurnState } from "./types";

const MAX_LOG = 80;

export interface NewGameOptions {
  id: string;
  settings: GameSettings;
  map: GameMap;
  players: { id: string; name: string }[];
  seed: number;
  now: number;
}

/** Sets up a fresh game: shuffled seat order, market and lost tribes. */
export function createGame({ id, settings, map, players, seed, now }: NewGameOptions): GameState {
  const rng = createRng(seed);
  const seats = rng.shuffle(players);
  const races = rng.shuffle(RACE_IDS);
  const powers = rng.shuffle(POWER_IDS);
  const state: GameState = {
    id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    settings,
    map,
    regions: map.regions.map((r) => ({
      owner: null,
      tokens: 0,
      declined: false,
      lostTribe: r.features.includes("lostTribe"),
      fortress: false,
      lair: false,
      hole: false,
    })),
    players: seats.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: i,
      coins: STARTING_COINS,
      connected: true,
      active: null,
      declined: null,
      history: [],
      stats: emptyStats(),
    })),
    market: races.slice(0, MARKET_SIZE).map((race, i) => ({ race, power: powers[i], coins: 0 })),
    racePool: races.slice(MARKET_SIZE),
    powerPool: powers.slice(MARKET_SIZE),
    rngState: rng.state(),
    turn: freshTurn(1, 0, "pick", settings, now),
    lastRoll: null,
    log: [],
    winners: [],
  };
  log(state, "gameStarted", { turns: settings.turns }, now);
  log(state, "turnStarted", { player: state.players[0].name, turn: 1 }, now);
  return state;
}

function freshTurn(number: number, playerIndex: number, phase: TurnState["phase"], settings: GameSettings, now: number): TurnState {
  return {
    number,
    playerIndex,
    phase,
    pickedThisTurn: false,
    conquests: 0,
    occupiedConquests: 0,
    attacked: [],
    fortressPlaced: false,
    deadline: settings.turnSeconds > 0 ? now + settings.turnSeconds * 1000 : null,
  };
}

function log(state: GameState, key: string, params: Record<string, string | number> | undefined, now: number) {
  state.log.push({ key, params, at: now });
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

const fail = (error: string): ActionResult => ({ ok: false, error });

/**
 * The single entry point that changes a game: validates `action` for `actorId` and returns the
 * next state (the input is never mutated). Runs on the host; clients only display its results.
 */
export function applyAction(previous: GameState, actorId: string, action: GameAction, now: number): ActionResult {
  if (previous.turn.phase === "finished") return fail("gameOver");
  if (currentPlayer(previous).id !== actorId) return fail("notYourTurn");
  const handler = handlers[action.type] as Handler<GameAction["type"]> | undefined;
  if (!handler) return fail("invalid");
  const state = structuredClone(previous);
  const error = handler(state, action, now);
  if (error) return fail(error);
  return commit(state, now);
}

/** Host-only actions: timeouts, connection status, renames. */
export function applySystem(previous: GameState, action: SystemAction, now: number): ActionResult {
  const state = structuredClone(previous);
  switch (action.type) {
    case "setConnected": {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.connected === action.connected) return fail("noChange");
      player.connected = action.connected;
      log(state, action.connected ? "playerBack" : "playerLeft", { player: player.name }, now);
      break;
    }
    case "rename": {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.name === action.name) return fail("noChange");
      player.name = action.name;
      break;
    }
    case "timeout": {
      if (state.turn.phase === "finished") return fail("gameOver");
      log(state, "timeout", { player: currentPlayer(state).name }, now);
      if (state.turn.phase === "pick") handlers.pick(state, { type: "pick", index: 0 }, now);
      if (state.turn.phase === "conquer") handlers.endConquest(state, { type: "endConquest" }, now);
      if (state.turn.phase === "redeploy") handlers.endTurn(state, { type: "endTurn" }, now);
      break;
    }
  }
  return commit(state, now);
}

function commit(state: GameState, now: number): ActionResult {
  state.version++;
  state.updatedAt = now;
  return { ok: true, state };
}

type Handler<T extends GameAction["type"]> = (state: GameState, action: Extract<GameAction, { type: T }>, now: number) => string | void;

const handlers: { [K in GameAction["type"]]: Handler<K> } = {
  pick(state, { index }, now) {
    if (state.turn.phase !== "pick") return "wrongPhase";
    const player = currentPlayer(state);
    if (!Number.isInteger(index) || index < 0 || index >= state.market.length) return "invalid";
    if (player.coins < index) return "notEnoughCoins";
    const rng = createRng(state.rngState);
    for (let i = 0; i < index; i++) state.market[i].coins++;
    player.coins -= index;
    const [combo] = state.market.splice(index, 1);
    player.coins += combo.coins;
    player.stats.coinsSpent += index;
    player.stats.coinsCollected += combo.coins;
    player.stats.races.push({ race: combo.race, power: combo.power, turn: state.turn.number });
    const race = RACES[combo.race];
    const power = POWERS[combo.power];
    player.active = {
      race: combo.race,
      power: combo.power,
      hand: race.tokens + power.tokens + (race.conquestOnlyTokens ?? 0),
      turnsPlayed: 0,
      holesLeft: race.marks === "hole" ? 2 : 0,
    };
    // Refill from the pools, reshuffled so that races coming back from decline reappear at random.
    if (state.racePool.length && state.powerPool.length) {
      state.racePool = rng.shuffle(state.racePool);
      state.powerPool = rng.shuffle(state.powerPool);
      state.market.push({ race: state.racePool.shift()!, power: state.powerPool.shift()!, coins: 0 });
    }
    state.rngState = rng.state();
    state.turn.pickedThisTurn = true;
    state.turn.phase = "conquer";
    log(state, "picked", { player: player.name, race: combo.race, power: combo.power, cost: index, gain: combo.coins }, now);
  },

  conquer(state, { region }, now) {
    const topology = topologyOf(state.map);
    if (!state.regions[region]) return "invalid";
    const block = conquestBlock(state, topology, region);
    if (block) return block;
    const player = currentPlayer(state);
    const cost = conquestCost(state, topology, region);
    if (player.active!.hand < cost) return "notEnoughTokens";
    takeRegion(state, region, cost, now);
  },

  roll(state, { region }, now) {
    if (!state.settings.reinforcementDie) return "dieDisabled";
    const topology = topologyOf(state.map);
    if (!state.regions[region]) return "invalid";
    const block = conquestBlock(state, topology, region);
    if (block) return block;
    const player = currentPlayer(state);
    const active = player.active!;
    const cost = conquestCost(state, topology, region);
    if (active.hand >= cost) return "noRollNeeded";
    const rng = createRng(state.rngState);
    const value = rng.pick(DIE_FACES);
    state.rngState = rng.state();
    const success = active.hand + value >= cost;
    state.lastRoll = { player: player.id, value, success };
    player.stats.rolls++;
    if (success) player.stats.rollsWon++;
    log(state, success ? "rollWon" : "rollLost", { player: player.name, value }, now);
    if (success) takeRegion(state, region, active.hand, now);
    // A reinforcement roll is always the last conquest of the turn.
    beginRedeploy(state, now);
  },

  abandon(state, { region }, now) {
    if (state.turn.phase !== "conquer" || state.turn.conquests > 0) return "wrongPhase";
    const player = currentPlayer(state);
    const target = state.regions[region];
    if (!target || target.owner !== player.id || target.declined || !player.active) return "invalid";
    player.active.hand += target.tokens;
    Object.assign(target, { owner: null, tokens: 0, fortress: false, lair: false, hole: false });
    log(state, "abandoned", { player: player.name }, now);
  },

  decline(state, _action, now) {
    if (!canDecline(state)) return "cannotDecline";
    const player = currentPlayer(state);
    goIntoDecline(state, player);
    player.stats.declines++;
    log(state, "declined", { player: player.name }, now);
    finishTurn(state, now);
  },

  endConquest(state, _action, now) {
    if (state.turn.phase !== "conquer") return "wrongPhase";
    beginRedeploy(state, now);
  },

  deploy(state, { region, delta }) {
    if (state.turn.phase !== "redeploy") return "wrongPhase";
    const player = currentPlayer(state);
    const target = state.regions[region];
    const active = player.active;
    if (!active || !target || target.owner !== player.id || target.declined) return "invalid";
    if (delta === 1) {
      if (active.hand <= 0) return "noTokens";
      target.tokens++;
      active.hand--;
    } else {
      if (target.tokens <= 1) return "lastToken";
      target.tokens--;
      active.hand++;
    }
  },

  fortress(state, { region }, now) {
    if (state.turn.phase !== "redeploy") return "wrongPhase";
    const player = currentPlayer(state);
    const target = state.regions[region];
    if (!player.active || !POWERS[player.active.power].fortresses) return "invalid";
    if (!target || target.owner !== player.id || target.declined || target.fortress) return "invalid";
    if (state.turn.fortressPlaced) return "fortressDone";
    const built = state.regions.filter((r) => r.owner === player.id && r.fortress).length;
    if (built >= MAX_FORTRESSES) return "fortressLimit";
    target.fortress = true;
    state.turn.fortressPlaced = true;
    log(state, "fortress", { player: player.name }, now);
  },

  endTurn(state, _action, now) {
    if (state.turn.phase !== "redeploy") return "wrongPhase";
    const player = currentPlayer(state);
    distributeHand(state, player);
    finishTurn(state, now);
  },
};

/** Moves `tokens` of the current player into `region`, dealing with whoever held it. */
function takeRegion(state: GameState, region: number, tokens: number, now: number) {
  const player = currentPlayer(state);
  const active = player.active!;
  const target = state.regions[region];
  const occupied = target.tokens > 0 || target.lostTribe;
  const defender = target.owner ? state.players.find((p) => p.id === target.owner) : undefined;

  if (defender && defender.id !== player.id && target.tokens > 0) {
    if (!target.declined && defender.active) {
      // The defender loses one token (none for elves) and gets the rest back.
      const loss = RACES[defender.active.race].noLosses ? 0 : 1;
      defender.active.hand += Math.max(0, target.tokens - loss);
      defender.stats.tokensLost += Math.min(loss, target.tokens);
    } else {
      defender.stats.tokensLost += target.tokens;
    }
    defender.stats.regionsLost++;
    player.stats.attacks++;
    if (!state.turn.attacked.includes(defender.id)) state.turn.attacked.push(defender.id);
    log(state, "conqueredFrom", { player: player.name, target: defender.name }, now);
  } else if (target.lostTribe) {
    player.stats.tribes++;
    log(state, "conqueredTribe", { player: player.name }, now);
  } else {
    log(state, "conquered", { player: player.name }, now);
  }

  const mark = RACES[active.race].marks;
  const hole = mark === "hole" && active.holesLeft > 0;
  if (hole) active.holesLeft--;
  Object.assign(target, {
    owner: player.id,
    tokens,
    declined: false,
    lostTribe: false,
    fortress: false,
    lair: mark === "lair",
    hole,
  });
  active.hand -= tokens;
  state.turn.conquests++;
  player.stats.conquests++;
  if (occupied) state.turn.occupiedConquests++;
}

function beginRedeploy(state: GameState, now: number) {
  const player = currentPlayer(state);
  const active = player.active;
  if (active) {
    const race = RACES[active.race];
    // Conquest-only tokens (amazons) leave before redeployment, from the hand first.
    let toRemove = race.conquestOnlyTokens ?? 0;
    const fromHand = Math.min(toRemove, active.hand);
    active.hand -= fromHand;
    toRemove -= fromHand;
    for (const r of regionsOf(state, player.id, false)) {
      while (toRemove > 0 && state.regions[r].tokens > 1) {
        state.regions[r].tokens--;
        toRemove--;
      }
    }
    const extra = race.reinforcements?.(state.turn.occupiedConquests) ?? 0;
    if (extra > 0) {
      active.hand += extra;
      log(state, "reinforced", { player: player.name, count: extra }, now);
    }
  }
  state.turn.phase = "redeploy";
}

/** Spreads the tokens left in hand over the player's regions (round-robin). */
function distributeHand(state: GameState, player: PlayerState) {
  const active = player.active;
  if (!active || active.hand <= 0) return;
  const own = regionsOf(state, player.id, false);
  if (own.length === 0) return;
  for (let i = 0; active.hand > 0; i++, active.hand--) state.regions[own[i % own.length]].tokens++;
}

function goIntoDecline(state: GameState, player: PlayerState) {
  if (!player.active) return;
  // The previous race in decline disappears from the map and goes back to the box.
  if (player.declined) {
    for (const r of regionsOf(state, player.id, true)) {
      Object.assign(state.regions[r], { owner: null, tokens: 0, declined: false, lair: false, hole: false, fortress: false });
    }
    state.racePool.push(player.declined.race);
    state.powerPool.push(player.declined.power);
  }
  for (const r of regionsOf(state, player.id, false)) {
    Object.assign(state.regions[r], { tokens: 1, declined: true, hole: false });
  }
  player.declined = { race: player.active.race, power: player.active.power };
  player.active = null;
}

/** Scores the current player, hands back stray tokens and moves to the next turn. */
function finishTurn(state: GameState, now: number) {
  const player = currentPlayer(state);
  const score = scoreBreakdown(state, player);
  player.coins += score.total;
  player.history.push(score.total);
  player.stats.earnedRegions += score.regions;
  player.stats.earnedBonus += score.race + score.power;
  player.stats.coinsTimeline.push(player.coins);
  player.stats.peakRegions = Math.max(player.stats.peakRegions, score.regions);
  log(state, "scored", { player: player.name, total: score.total, regions: score.regions, bonus: score.race + score.power }, now);
  if (player.active) player.active.turnsPlayed++;

  // Defenders put the tokens they got back on their remaining regions.
  for (const other of state.players) if (other.id !== player.id) distributeHand(state, other);

  state.lastRoll = null;
  let { number, playerIndex } = state.turn;
  playerIndex++;
  if (playerIndex >= state.players.length) {
    playerIndex = 0;
    number++;
  }
  if (number > state.settings.turns) {
    state.turn = { ...state.turn, phase: "finished", deadline: null };
    state.winners = leaders(state);
    const names = state.players.filter((p) => state.winners.includes(p.id)).map((p) => p.name);
    log(state, "gameOver", { winners: names.join(", ") }, now);
    return;
  }
  const next = state.players[playerIndex];
  state.turn = freshTurn(number, playerIndex, next.active ? "conquer" : "pick", state.settings, now);
  if (next.active) gatherTroops(state, next);
  log(state, "turnStarted", { player: next.name, turn: number }, now);
}

/** Start of turn: every active region keeps one token, the rest goes back to hand. */
function gatherTroops(state: GameState, player: PlayerState) {
  const active = player.active!;
  for (const r of regionsOf(state, player.id, false)) {
    const region = state.regions[r];
    active.hand += region.tokens - 1;
    region.tokens = 1;
  }
  active.hand += RACES[active.race].conquestOnlyTokens ?? 0;
}
