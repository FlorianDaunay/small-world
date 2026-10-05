import type { ConquestContext, DefenceContext, ScoreContext } from "./context";
import type { GameState, PlayerState } from "./types";

/**
 * Rules an extension or an event changes for every player alike (races and powers only affect
 * their owner). The rules engine sums the hooks of every rule set in play.
 */
export interface WorldRules {
  /** Lakes can be conquered and held like land. */
  landLakes?: boolean;
  /** Extra (or reduced) defence of a region. */
  defence?: (ctx: DefenceContext) => number;
  /** Tokens saved on the cost of a conquest. */
  discount?: (ctx: ConquestContext) => number;
  /** Extra coins at the end of a turn; `regions` holds all the player's regions. */
  score?: (ctx: ScoreContext) => number;
  /** Tokens the current player gains before redeployment. */
  reinforcements?: (ctx: { state: GameState; player: PlayerState }) => number;
}
