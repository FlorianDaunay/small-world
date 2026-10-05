import { seaside } from "./events";
import { POWER_IDS, type PowerId } from "./powers";
import { RACE_IDS, type RaceId } from "./races";
import type { WorldRules } from "./world";

export const EXTENSION_IDS = ["cursed", "wilds", "legends", "winter", "drought"] as const;
export type ExtensionId = (typeof EXTENSION_IDS)[number];

/**
 * An optional extension chosen when creating a game: new races and powers for the market,
 * rules changed for everyone, and/or a deck of events. Extensions listed in `conflicts`
 * cannot be played together (the relation is symmetric). Names and descriptions live in the
 * i18n dictionaries (`extension.<id>`); art and ambiance in `features/extensions/art.ts`.
 */
export interface ExtensionDef {
  id: ExtensionId;
  races: readonly RaceId[];
  powers: readonly PowerId[];
  rules?: WorldRules;
  /** Draws an event at the start of every game turn (see `events.ts`). */
  events?: boolean;
  conflicts?: readonly ExtensionId[];
}

const mountainDefence: WorldRules["defence"] = ({ state, region }) => (state.map.regions[region].terrain === "mountain" ? 1 : 0);

export const EXTENSIONS: Record<ExtensionId, ExtensionDef> = {
  cursed: { id: "cursed", races: ["goblins", "kobolds"], powers: ["hordes", "marauding"] },
  wilds: { id: "wilds", races: ["dryads", "leprechauns"], powers: ["imperial", "entrenched"] },
  legends: { id: "legends", races: [], powers: [], events: true },
  winter: { id: "winter", races: [], powers: [], rules: { landLakes: true, defence: mountainDefence }, conflicts: ["drought"] },
  drought: { id: "drought", races: [], powers: [], rules: { landLakes: true, score: seaside }, conflicts: ["winter"] },
};

/** Whether two extensions cannot be played together. */
export const conflicting = (a: ExtensionId, b: ExtensionId): boolean =>
  !!EXTENSIONS[a].conflicts?.includes(b) || !!EXTENSIONS[b].conflicts?.includes(a);

/** Selected extensions that would conflict with `id`. */
export const conflictsOf = (id: ExtensionId, selected: readonly ExtensionId[]): ExtensionId[] =>
  selected.filter((other) => other !== id && conflicting(id, other));

/** Keeps known extensions only, once each, in catalogue order, dropping any that conflict with an earlier one. */
export function sanitizeExtensions(ids: readonly unknown[] | undefined): ExtensionId[] {
  const result: ExtensionId[] = [];
  for (const id of EXTENSION_IDS) {
    if (ids?.includes(id) && conflictsOf(id, result).length === 0) result.push(id);
  }
  return result;
}

const fromExtensions = new Set<string>(Object.values(EXTENSIONS).flatMap((e) => [...e.races, ...e.powers]));

/** Races in play: the base game's plus those of the chosen extensions. */
export const availableRaces = (extensions: readonly ExtensionId[]): RaceId[] =>
  RACE_IDS.filter((id) => !fromExtensions.has(id) || extensions.some((e) => EXTENSIONS[e].races.includes(id)));

/** Powers in play: the base game's plus those of the chosen extensions. */
export const availablePowers = (extensions: readonly ExtensionId[]): PowerId[] =>
  POWER_IDS.filter((id) => !fromExtensions.has(id) || extensions.some((e) => EXTENSIONS[e].powers.includes(id)));

/** Whether a race or power belongs to the base game. */
export const isBaseContent = (id: RaceId | PowerId): boolean => !fromExtensions.has(id);
