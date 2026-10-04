import { analyzeMap } from "./analysis";
import { defaultMap } from "./defaults";
import { MAP_PRESETS, generateMap } from "./generator";
import { buildTopology, connectedGroups } from "./topology";
import { isWater } from "./types";

describe("map generation", () => {
  it.each([2, 3, 4, 5])("builds a playable, balanced default map for %i players", (players) => {
    const map = defaultMap(players);
    const report = analyzeMap(map, players);
    expect(report.playable).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(60);
    expect(map.regions.length).toBe(MAP_PRESETS[players].regions);
  });

  it("is deterministic for a given seed", () => {
    const options = { ...MAP_PRESETS[3], seed: 7, id: "a", name: "a" };
    expect(generateMap(options).cells).toEqual(generateMap(options).cells);
  });

  it("keeps all land connected", () => {
    const map = generateMap({ ...MAP_PRESETS[4], seed: 99, id: "b", name: "b" });
    const topology = buildTopology(map);
    expect(connectedGroups(topology, (r) => !isWater(map.regions[r].terrain))).toHaveLength(1);
  });
});

describe("balance analysis", () => {
  it("flags a map cut in two as unplayable", () => {
    const map = structuredClone(defaultMap(2));
    // Flood everything but two regions that do not touch each other.
    const topology = buildTopology(map);
    const far = map.regions.findIndex((_, i) => i > 0 && !topology.adjacency[0].includes(i));
    map.regions.forEach((r, i) => {
      if (i !== 0 && i !== far) r.terrain = "sea";
    });
    const report = analyzeMap(map, 2);
    expect(report.issues.some((i) => i.key === "disconnected")).toBe(true);
    expect(report.playable).toBe(false);
  });

  it("warns when one terrain dominates", () => {
    const map = structuredClone(defaultMap(3));
    map.regions.forEach((r) => {
      if (!isWater(r.terrain)) r.terrain = "mountain";
    });
    const report = analyzeMap(map, 3);
    expect(report.issues.some((i) => i.key === "tooMuchTerrain" && i.params?.terrain === "mountain")).toBe(true);
  });
});
