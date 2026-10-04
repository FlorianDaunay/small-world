import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/features/layout/Header";
import { ChatPanel } from "@/features/room/ChatPanel";
import { RulesContent } from "@/features/rules/RulesPage";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { downloadJson } from "@/store/storage";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { Tabs } from "@/ui/Tabs";
import { confirmDialog } from "@/ui/feedback";
import { Board } from "./Board";
import { ActionPanel, LogPanel, MarketPanel, PlayersPanel, TurnTimer } from "./panels";
import { useGame } from "./useGame";

type SideTab = "players" | "market" | "log" | "chat";

export function GameView() {
  const t = useT();
  const navigate = useNavigate();
  const { game, current, myTurn, view } = useGame();
  const { leave, password } = useSession();
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<SideTab>("players");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(true);
  const phase = game.turn.phase;

  // Jump to the market when it is our turn to pick, back to players afterwards.
  useEffect(() => {
    if (myTurn && phase === "pick") setTab("market");
    else setTab((tab) => (tab === "market" ? "players" : tab));
  }, [myTurn, phase]);
  useEffect(() => setSelected(null), [game.turn.playerIndex, phase]);

  const quit = async () => {
    const ok = await confirmDialog({ title: t("game.leave"), message: t("game.leaveConfirm"), confirmLabel: t("game.leave"), cancelLabel: t("common.cancel"), danger: true });
    if (!ok) return;
    leave();
    navigate("/");
  };

  const exportSave = () => downloadJson(`smallworld-${game.id}.json`, { id: game.id, code: view.room.code, password, game, savedAt: Date.now() });

  return (
    <div className="flex h-full flex-col">
      <Header>
        <span className="badge whitespace-nowrap">{t("game.turn", { turn: Math.min(game.turn.number, game.settings.turns), turns: game.settings.turns })}</span>
        {phase !== "finished" && (
          <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
            <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: playerColor(current.color) }} />
            <span className="truncate">{myTurn ? t("game.yourTurn") : t("game.turnOf", { player: current.name })}</span>
          </span>
        )}
        <TurnTimer />
        <span className="ml-auto hidden font-mono text-xs text-text-muted md:inline">{view.room.code}</span>
        <Button variant="ghost" size="sm" onClick={() => setRulesOpen(true)}>
          📜 <span className="hidden sm:inline">{t("home.rules")}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={exportSave} title={t("game.saveFile")}>
          💾
        </Button>
        <Button variant="ghost" size="sm" onClick={quit} title={t("game.leave")}>
          🚪
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-[50vh] flex-1">
          <Board selected={selected} onSelect={setSelected} />
        </main>
        <aside className="surface flex w-full shrink-0 flex-col border-y-0 border-r-0 lg:w-96">
          <section className={`border-b border-border p-4 ${myTurn ? "bg-accent/10" : ""}`}>
            <ActionPanel selected={selected} onSelect={setSelected} />
          </section>
          <div className="px-2 pt-2">
            <Tabs<SideTab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "players", label: t("game.score") },
                { value: "market", label: t("game.market") },
                { value: "log", label: t("game.log") },
                { value: "chat", label: t("lobby.chat") },
              ]}
            />
          </div>
          <div className="scrollbar-thin min-h-[16rem] flex-1 overflow-y-auto p-3">
            {tab === "players" && <PlayersPanel />}
            {tab === "market" && <MarketPanel />}
            {tab === "log" && <LogPanel />}
            {tab === "chat" && <ChatPanel className="h-full" />}
          </div>
        </aside>
      </div>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title={t("rules.title")} size="lg">
        <RulesContent />
      </Modal>
      {phase === "finished" && <ResultsModal open={resultsOpen} onClose={() => setResultsOpen(false)} />}
    </div>
  );
}

function ResultsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const leave = useSession((s) => s.leave);
  const { game } = useGame();
  const ranking = [...game.players].sort((a, b) => b.coins - a.coins);
  const winners = game.players.filter((p) => game.winners.includes(p.id)).map((p) => p.name).join(", ");
  const best = Math.max(1, ...game.players.flatMap((p) => p.history));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`🏆 ${t("game.results")}`}
      footer={
        <Button
          variant="primary"
          onClick={() => {
            leave();
            navigate("/");
          }}
        >
          {t("game.backHome")}
        </Button>
      }
    >
      <p className="mb-4 text-center text-lg font-semibold">{t(game.winners.length > 1 ? "game.winners" : "game.winner", { names: winners })}</p>
      <ol className="space-y-3">
        {ranking.map((p, i) => (
          <li key={p.id} className="rounded-tile border border-border bg-canvas p-3">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-lg font-bold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span className="h-3 w-3 rounded-pill" style={{ background: playerColor(p.color) }} />
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-mono font-bold">🪙 {p.coins}</span>
            </div>
            <div className="mt-2 flex h-8 items-end gap-0.5 pl-9" aria-hidden>
              {p.history.map((coins, turn) => (
                <div key={turn} className="flex-1 rounded-t-sm" style={{ height: `${(coins / best) * 100}%`, background: playerColor(p.color), opacity: 0.8 }} title={`${coins}`} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
