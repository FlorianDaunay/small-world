import { topologyOf } from "../map/cache";
import type { ScoreContext } from "./context";
import type { WorldRules } from "./world";

/**
 * Events of the "legends" extension: one is drawn at the start of every game turn and changes
 * the rules for everyone until the next one. Names and descriptions: `event.<id>` in i18n.
 */
export const EVENT_IDS = ["harvest", "goldRush", "arcane", "fog", "truce", "migration", "plague", "landslide"] as const;
export type EventId = (typeof EVENT_IDS)[number];

const countHeld = (test: (ctx: ScoreContext, region: number) => boolean) => (ctx: ScoreContext) =>
  ctx.regions.filter((i) => test(ctx, i)).length;

export const EVENTS: Record<EventId, WorldRules> = {
  harvest: { score: countHeld(({ state }, i) => state.map.regions[i].terrain === "farmland") },
  goldRush: { score: countHeld(({ state }, i) => state.map.regions[i].features.includes("mine")) },
  arcane: { score: countHeld(({ state }, i) => state.map.regions[i].features.includes("magic")) },
  fog: { discount: () => 1 },
  truce: { defence: ({ state, region }) => (state.regions[region].owner ? 1 : 0) },
  migration: { reinforcements: () => 2 },
  plague: { score: (ctx) => -countHeld(({ state }, i) => state.regions[i].declined)(ctx) },
  landslide: { defence: ({ state, region }) => (state.map.regions[region].terrain === "mountain" ? -1 : 0) },
};

/** Regions next to a sea (used by the drought, where water is precious). */
export const seaside = (ctx: ScoreContext): number => {
  const topology = topologyOf(ctx.state.map);
  return countHeld(({ state }, i) => topology.adjacency[i].some((n) => state.map.regions[n].terrain === "sea"))(ctx);
};
