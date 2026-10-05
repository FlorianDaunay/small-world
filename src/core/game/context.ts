import type { MapTopology } from "../map/topology";
import type { GameState, PlayerState } from "./types";

/** What a race or power sees when the rules ask it about a conquest. */
export interface ConquestContext {
  state: GameState;
  topology: MapTopology;
  player: PlayerState;
  region: number;
}

/** What a race or power sees when the turn is scored. */
export interface ScoreContext {
  state: GameState;
  player: PlayerState;
  /** Regions held by the race being scored (all the player's regions for world rules). */
  regions: number[];
}

/** What a hook sees when the rules compute a region's defence. */
export interface DefenceContext {
  state: GameState;
  region: number;
}
