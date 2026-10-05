import { defaultMap } from "../map/defaults";
import { topologyOf } from "../map/cache";
import { applyAction, applySystem, createGame } from "./engine";
import { newLogEntries } from "./log";
import { normalizeGame } from "./migrate";
import { conquestBlock, conquestCost, currentPlayer, regionsOf } from "./rules";
import type { GameAction, GameState } from "./types";

const NOW = 1_000_000;

function newGame(players = 2, turns = 3, die = true): GameState {
  return createGame({
    id: "test",
    settings: { maxPlayers: players, turns, turnSeconds: 0, mapId: "default", reinforcementDie: die, extensions: [] },
    map: defaultMap(players),
    players: Array.from({ length: players }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
    seed: 42,
    now: NOW,
  });
}

function act(state: GameState, action: GameAction): GameState {
  const result = applyAction(state, currentPlayer(state).id, action, NOW);
  if (!result.ok) throw new Error(`${action.type} refused: ${result.error}`);
  return result.state;
}

/** First region the current player may conquer right now, with enough tokens. */
function firstTarget(state: GameState): number {
  const topology = topologyOf(state.map);
  const hand = currentPlayer(state).active!.hand;
  const index = state.regions.findIndex((_, i) => !conquestBlock(state, topology, i) && conquestCost(state, topology, i) <= hand);
  if (index < 0) throw new Error("no target");
  return index;
}

describe("game engine", () => {
  it("starts with a full market and everyone in the pick phase", () => {
    const state = newGame();
    expect(state.market).toHaveLength(6);
    expect(state.turn.phase).toBe("pick");
    expect(state.players.every((p) => p.coins === 5)).toBe(true);
  });

  it("charges one coin per skipped combo and leaves it on that combo", () => {
    let state = newGame();
    state = act(state, { type: "pick", index: 2 });
    expect(currentPlayer(state).coins).toBe(3);
    expect(state.market[0].coins).toBe(1);
    expect(state.market[1].coins).toBe(1);
    expect(state.market).toHaveLength(6);
    expect(state.turn.phase).toBe("conquer");
  });

  it("refuses actions from a player whose turn it is not", () => {
    const state = newGame();
    const other = state.players[1].id;
    const result = applyAction(state, other, { type: "pick", index: 0 }, NOW);
    expect(result).toEqual({ ok: false, error: "notYourTurn" });
  });

  it("only allows a first conquest on the edge of the map", () => {
    let state = newGame();
    state = act(state, { type: "pick", index: 0 });
    const topology = topologyOf(state.map);
    const race = currentPlayer(state).active!.race;
    const inner = state.regions.findIndex((_, i) => !topology.edge[i] && state.map.regions[i].terrain !== "sea" && state.map.regions[i].terrain !== "lake");
    const block = conquestBlock(state, topology, inner);
    if (race === "halflings" || currentPlayer(state).active!.power === "flying") expect(block).toBeNull();
    else expect(block).toBe("notEdge");
  });

  it("plays full turns, scores and ends the game", () => {
    let state = newGame(2, 2);
    for (let guard = 0; guard < 50 && state.turn.phase !== "finished"; guard++) {
      if (state.turn.phase === "pick") state = act(state, { type: "pick", index: 0 });
      if (state.turn.phase === "conquer") {
        const before = currentPlayer(state).active!.hand;
        state = act(state, { type: "conquer", region: firstTarget(state) });
        expect(currentPlayer(state).active!.hand).toBeLessThan(before);
        state = act(state, { type: "endConquest" });
      }
      state = act(state, { type: "endTurn" });
    }
    expect(state.turn.phase).toBe("finished");
    expect(state.winners.length).toBeGreaterThan(0);
    expect(state.players.every((p) => p.history.length === 2)).toBe(true);
  });

  it("puts a race in decline with one token per region", () => {
    let state = newGame(2, 5);
    for (let i = 0; i < 2; i++) {
      state = act(state, { type: "pick", index: 0 });
      state = act(state, { type: "conquer", region: firstTarget(state) });
      state = act(state, { type: "endConquest" });
      state = act(state, { type: "endTurn" });
    }
    const me = currentPlayer(state).id;
    const held = regionsOf(state, me, false);
    state = act(state, { type: "decline" });
    const after = state.players.find((p) => p.id === me)!;
    expect(after.active).toBeNull();
    expect(after.declined).not.toBeNull();
    expect(held.every((r) => state.regions[r].declined && state.regions[r].tokens === 1)).toBe(true);
  });

  it("times out a turn by playing the minimum for the player", () => {
    const state = newGame();
    const result = applySystem(state, { type: "timeout" }, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.turn.playerIndex).toBe(1);
      expect(result.state.players[0].active).not.toBeNull();
    }
  });

  it("never mutates the previous state", () => {
    const state = newGame();
    const snapshot = JSON.stringify(state);
    act(state, { type: "pick", index: 3 });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("keeps statistics for the end of the game", () => {
    let state = newGame(2, 2);
    const first = currentPlayer(state).id;
    state = act(state, { type: "pick", index: 1 });
    state = act(state, { type: "conquer", region: firstTarget(state) });
    state = act(state, { type: "endConquest" });
    state = act(state, { type: "endTurn" });
    const stats = state.players.find((p) => p.id === first)!.stats;
    expect(stats.coinsSpent).toBe(1);
    expect(stats.conquests).toBe(1);
    expect(stats.races).toHaveLength(1);
    expect(stats.coinsTimeline).toEqual([state.players.find((p) => p.id === first)!.coins]);
    expect(stats.earnedRegions).toBe(1);
  });

  it("upgrades games saved before statistics existed", () => {
    const state = newGame();
    const old = structuredClone(state) as GameState;
    old.players[0].history = [3, 4];
    delete (old.players[0] as Partial<typeof old.players[0]>).stats;
    const upgraded = normalizeGame(old);
    expect(upgraded.players[0].stats.coinsTimeline).toEqual([8, 12]);
  });

  it("refuses the reinforcement die when the option is off", () => {
    let state = newGame(2, 3, false);
    state = act(state, { type: "pick", index: 0 });
    const topology = topologyOf(state.map);
    const target = state.regions.findIndex((_, i) => !conquestBlock(state, topology, i));
    const result = applyAction(state, currentPlayer(state).id, { type: "roll", region: target }, NOW);
    expect(result).toEqual({ ok: false, error: "dieDisabled" });
  });

  it("enables the die for games saved before the option existed", () => {
    const old = structuredClone(newGame());
    delete (old.settings as Partial<typeof old.settings>).reinforcementDie;
    expect(normalizeGame(old).settings.reinforcementDie).toBe(true);
  });
});

describe("log diff", () => {
  const entry = (key: string, at: number) => ({ key, at });

  it("returns the entries added since the previous log, even once the log is capped", () => {
    const before = [entry("a", 1), entry("b", 2)];
    expect(newLogEntries(before, [...before, entry("c", 3)])).toEqual([entry("c", 3)]);
    expect(newLogEntries(before, [entry("b", 2), entry("c", 3), entry("d", 4)])).toEqual([entry("c", 3), entry("d", 4)]);
    expect(newLogEntries(before, before)).toEqual([]);
    expect(newLogEntries([], [entry("a", 1)])).toEqual([entry("a", 1)]);
  });
});
