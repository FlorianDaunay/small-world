import { useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GameView } from "@/features/game/GameView";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { toast } from "@/ui/feedback";
import { LobbyView } from "./LobbyView";

/** The room route: lobby before the game, board during it, plus connection states. */
export function RoomPage() {
  const t = useT();
  const navigate = useNavigate();
  const { view, leave } = useSession();
  useRefusalToasts();

  if (!view) return <Navigate to="/" replace />;

  if (view.status === "closed") {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <div className="text-4xl">🔌</div>
          <p className="font-semibold">{t.dyn(`errors.${view.error ?? "closed"}`)}</p>
          <Button
            variant="primary"
            onClick={() => {
              leave();
              navigate("/");
            }}
          >
            {t("game.backHome")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {view.status === "migrating" && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-2">
          <div className="card animate-pop flex items-center gap-2 border-warning px-4 py-2 text-sm shadow-overlay">
            <span className="animate-spin">⏳</span> {t("lobby.migrating")}
          </div>
        </div>
      )}
      {view.room.game ? <GameView /> : <LobbyView />}
    </>
  );
}

/** Shows the host's refusals of our actions as toasts (once each). */
function useRefusalToasts() {
  const t = useT();
  const refusal = useSession((s) => s.view?.refusal);
  const shown = useRef<number>(0);
  useEffect(() => {
    if (!refusal || refusal.at === shown.current) return;
    shown.current = refusal.at;
    const specific = t.dyn(`game.refused.${refusal.error}`);
    const block = t.dyn(`game.blocks.${refusal.error}`);
    toast(specific.startsWith("game.") ? (block.startsWith("game.") ? t("game.refused.generic") : block) : specific, "danger");
  }, [refusal, t]);
}
