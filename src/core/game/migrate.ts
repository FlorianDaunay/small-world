import { sanitizeExtensions } from "./extensions";
import { STARTING_COINS } from "./rules";
import type { GameState, PlayerStats } from "./types";

export const emptyStats = (): PlayerStats => ({
  conquests: 0,
  attacks: 0,
  tribes: 0,
  regionsLost: 0,
  tokensLost: 0,
  rolls: 0,
  rollsWon: 0,
  declines: 0,
  coinsSpent: 0,
  coinsCollected: 0,
  earnedRegions: 0,
  earnedBonus: 0,
  peakRegions: 0,
  races: [],
  coinsTimeline: [],
});

/**
 * Brings a game saved by an older version up to the current shape (missing fields get
 * sensible defaults). Applied whenever a game comes from storage or a file.
 */
export function normalizeGame(game: GameState): GameState {
  const copy = structuredClone(game);
  copy.settings.reinforcementDie ??= true;
  copy.settings.extensions = sanitizeExtensions(copy.settings.extensions);
  copy.event ??= null;
  for (const player of copy.players) {
    if (!player.stats) {
      const stats = emptyStats();
      let coins = STARTING_COINS;
      stats.coinsTimeline = (player.history ?? []).map((earned) => (coins += earned));
      if (player.active) stats.races.push({ race: player.active.race, power: player.active.power, turn: copy.turn.number });
      player.stats = stats;
    }
    player.history ??= [];
  }
  return copy;
}
