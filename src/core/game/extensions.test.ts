import { topologyOf } from "../map/cache";
import type { GameMap, Terrain } from "../map/types";
import { applyAction, createGame } from "./engine";
import { EVENT_IDS } from "./events";
import { availablePowers, availableRaces, conflictsOf, sanitizeExtensions, type ExtensionId } from "./extensions";
import { normalizeGame } from "./migrate";
import type { PowerId } from "./powers";
import type { RaceId } from "./races";
import { conquestBlock, conquestCost, currentPlayer, regionDefence, scoreBreakdown } from "./rules";
import type { GameAction, GameState } from "./types";

const NOW = 1_000_000;

/** A single row of one-cell regions: every region touches its neighbours and the map's edge. */
function rowMap(terrains: Terrain[]): GameMap {
  return {
    id: `row-${terrains.join("-")}`,
    name: "row",
    cols: terrains.length,
    rows: 1,
    cells: terrains.map((_, i) => i),
    regions: terrains.map((terrain) => ({ terrain, features: [] })),
    createdAt: 0,
    updatedAt: 0,
  };
}

function newGame(extensions: ExtensionId[] = [], map: GameMap = rowMap(["farmland", "forest", "mountain", "lake", "hill", "sea"]), seed = 7): GameState {
  return createGame({
    id: "test",
    settings: { maxPlayers: 2, turns: 4, turnSeconds: 0, mapId: map.id, reinforcementDie: true, extensions },
    map,
    players: [
      { id: "p0", name: "P0" },
      { id: "p1", name: "P1" },
    ],
    seed,
    now: NOW,
  });
}

/** Gives the current player a race/power in the conquest phase (bypassing the market). */
function withCombo(state: GameState, race: RaceId, power: PowerId, hand = 10): GameState {
  const next = structuredClone(state);
  currentPlayer(next).active = { race, power, hand, turnsPlayed: 0, holesLeft: 0 };
  next.turn.phase = "conquer";
  next.turn.pickedThisTurn = true;
  return next;
}

function act(state: GameState, action: GameAction): GameState {
  const result = applyAction(state, currentPlayer(state).id, action, NOW);
  if (!result.ok) throw new Error(`${action.type} refused: ${result.error}`);
  return result.state;
}

const me = (state: GameState) => currentPlayer(state).id;
const other = (state: GameState) => state.players.find((p) => p.id !== me(state))!.id;

/** Puts `tokens` of a player on a region. */
function occupy(state: GameState, region: number, owner: string, tokens: number, declined = false) {
  Object.assign(state.regions[region], { owner, tokens, declined, lostTribe: false });
}

describe("extension catalogue", () => {
  it("keeps known extensions once, and never two conflicting ones", () => {
    expect(sanitizeExtensions(["winter", "drought", "cursed", "cursed", "nope"])).toEqual(["cursed", "winter"]);
    expect(conflictsOf("drought", ["winter", "legends"])).toEqual(["winter"]);
  });

  it("only adds an extension's races and powers when it is chosen", () => {
    expect(availableRaces([])).not.toContain("goblins");
    expect(availablePowers([])).not.toContain("hordes");
    expect(availableRaces(["cursed"])).toEqual(expect.arrayContaining(["goblins", "kobolds", "humans"]));
    expect(availablePowers(["wilds"])).toEqual(expect.arrayContaining(["imperial", "entrenched"]));
  });

  it("deals the chosen extensions' races into the market or the pool", () => {
    const state = newGame(["cursed"]);
    const races = [...state.market.map((c) => c.race), ...state.racePool];
    expect(races).toEqual(expect.arrayContaining(["goblins", "kobolds"]));
    expect(races).not.toContain("dryads");
  });

  it("drops conflicting extensions when a game is created", () => {
    expect(newGame(["winter", "drought"]).settings.extensions).toEqual(["winter"]);
  });

  it("upgrades games saved before extensions existed", () => {
    const old = structuredClone(newGame());
    delete (old.settings as Partial<GameState["settings"]>).extensions;
    delete (old as Partial<GameState>).event;
    const upgraded = normalizeGame(old);
    expect(upgraded.settings.extensions).toEqual([]);
    expect(upgraded.event).toBeNull();
  });
});

describe("extension races and powers", () => {
  it("kobolds need two tokens per region and keep two when gathering", () => {
    let state = withCombo(newGame(["cursed"]), "kobolds", "hordes", 11);
    const topology = topologyOf(state.map);
    expect(conquestCost(state, topology, 0)).toBe(2);
    state = act(state, { type: "conquer", region: 0 });
    state = act(state, { type: "endConquest" });
    expect(applyAction(state, me(state), { type: "deploy", region: 0, delta: -1 }, NOW)).toEqual({ ok: false, error: "lastToken" });
  });

  it("refuses a conquest when kobolds have a single token left", () => {
    const state = withCombo(newGame(["cursed"]), "kobolds", "hordes", 1);
    expect(conquestBlock(state, topologyOf(state.map), 0)).toBe("noTokens");
  });

  it("hordes gain a token before every redeployment", () => {
    let state = withCombo(newGame(["cursed"]), "humans", "hordes", 5);
    state = act(state, { type: "endConquest" });
    expect(currentPlayer(state).active!.hand).toBe(6);
  });

  it("goblins pay less to take a region from a race in decline", () => {
    const state = withCombo(newGame(["cursed"]), "goblins", "alchemist");
    occupy(state, 0, other(state), 1, true);
    const topology = topologyOf(state.map);
    expect(conquestCost(state, topology, 0)).toBe(2); // 2 + 1 token − 1
  });

  it("marauders pay less for regions without tokens", () => {
    const state = withCombo(newGame(["cursed"]), "humans", "marauding");
    expect(conquestCost(state, topologyOf(state.map), 0)).toBe(1);
  });

  it("dryads defend their forests better", () => {
    const state = newGame(["wilds"]);
    state.players.find((p) => p.id === other(state))!.active = { race: "dryads", power: "alchemist", hand: 0, turnsPlayed: 1, holesLeft: 0 };
    occupy(state, 1, other(state), 1);
    occupy(state, 0, other(state), 1);
    expect(regionDefence(state, 1)).toBe(3);
    expect(regionDefence(state, 0)).toBe(1);
  });

  it("leprechauns score one coin per land terrain held, imperial ones beyond three regions", () => {
    const state = withCombo(newGame(["wilds"]), "leprechauns", "imperial");
    [0, 1, 2, 4].forEach((r) => occupy(state, r, me(state), 1));
    const score = scoreBreakdown(state, currentPlayer(state));
    expect(score.race).toBe(4);
    expect(score.power).toBe(1);
  });

  it("entrenched players earn 4 coins with four regions or fewer", () => {
    const state = withCombo(newGame(["wilds"]), "humans", "entrenched");
    expect(scoreBreakdown(state, currentPlayer(state)).power).toBe(0);
    occupy(state, 1, me(state), 1);
    expect(scoreBreakdown(state, currentPlayer(state)).power).toBe(4);
  });
});

describe("world rules", () => {
  it("lets everyone conquer frozen lakes in winter, and snow defends the mountains", () => {
    const plain = withCombo(newGame(), "humans", "alchemist");
    occupy(plain, 2, me(plain), 1);
    expect(conquestBlock(plain, topologyOf(plain.map), 3)).toBe("water");

    const winter = withCombo(newGame(["winter"]), "humans", "alchemist");
    occupy(winter, 2, me(winter), 1);
    expect(conquestBlock(winter, topologyOf(winter.map), 3)).toBeNull();
    expect(regionDefence(winter, 2)).toBe(3); // 1 token + mountain + snow
    expect(conquestBlock(winter, topologyOf(winter.map), 5)).toBe("water"); // the sea never freezes
  });

  it("pays an extra coin for seaside regions during the drought", () => {
    const state = withCombo(newGame(["drought"]), "humans", "alchemist");
    occupy(state, 4, me(state), 1); // hill next to the sea
    occupy(state, 3, me(state), 1); // dried lake
    expect(scoreBreakdown(state, currentPlayer(state)).world).toBe(1);
  });

  it("draws a new event at the start of every game turn with the legends extension", () => {
    let state = newGame(["legends"]);
    expect(EVENT_IDS).toContain(state.event);
    expect(state.log.some((e) => e.key === "event")).toBe(true);
    const first = state.event;
    for (let i = 0; i < 2; i++) {
      state = act(state, { type: "pick", index: 0 });
      state = act(state, { type: "endConquest" });
      state = act(state, { type: "endTurn" });
    }
    expect(state.turn.number).toBe(2);
    expect(state.event).not.toBe(first);
    expect(newGame().event).toBeNull();
  });

  it("applies the current event's hooks", () => {
    const state = withCombo(newGame(["legends"]), "humans", "alchemist");
    const topology = topologyOf(state.map);
    state.event = "fog";
    expect(conquestCost(state, topology, 0)).toBe(1);
    state.event = "harvest";
    occupy(state, 0, me(state), 1);
    expect(scoreBreakdown(state, currentPlayer(state)).world).toBe(1);
    state.event = "plague";
    occupy(state, 1, me(state), 1, true);
    expect(scoreBreakdown(state, currentPlayer(state)).world).toBe(-1);
  });

  it("logs the conquered region for the board animations", () => {
    let state = withCombo(newGame(), "humans", "alchemist");
    state = act(state, { type: "conquer", region: 0 });
    expect(state.log[state.log.length - 1]).toMatchObject({ key: "conquered", params: { region: 0 } });
  });
});
