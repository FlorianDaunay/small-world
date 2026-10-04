import { useMemo } from "react";
import { conquestBlock, conquestCost, currentPlayer, regionsOf, type GameState } from "@/core/game";
import { topologyOf } from "@/core/map/cache";
import { useSession } from "@/store/session";

/** Everything the game screen derives from the session, in one place. */
export function useGame() {
  const view = useSession((s) => s.view);
  const dispatch = useSession((s) => s.dispatch);
  const game = view?.room.game as GameState;
  const me = view?.me ?? "";
  const topology = useMemo(() => topologyOf(game.map), [game.map]);
  const current = currentPlayer(game);
  const myTurn = current.id === me && game.turn.phase !== "finished";
  const self = game.players.find((p) => p.id === me) ?? null;

  /** Regions I can conquer right now → cost. */
  const targets = useMemo(() => {
    const result = new Map<number, number>();
    if (!myTurn || game.turn.phase !== "conquer") return result;
    game.regions.forEach((_, i) => {
      if (!conquestBlock(game, topology, i)) result.set(i, conquestCost(game, topology, i));
    });
    return result;
  }, [game, topology, myTurn]);

  const myRegions = useMemo(() => new Set(regionsOf(game, me, false)), [game, me]);

  return { view: view!, game, me, self, current, myTurn, topology, targets, myRegions, dispatch, isHost: view?.role === "host" };
}
