import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ambiance } from "@/features/extensions/Ambiance";
import { Header } from "@/features/layout/Header";
import { playerColor } from "@/features/map/palette";
import { ChatPanel } from "@/features/room/ChatPanel";
import { RulesContent } from "@/features/rules/RulesPage";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { downloadJson } from "@/store/storage";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { confirmDialog } from "@/ui/feedback";
import { cx } from "@/ui/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import { Board } from "./Board";
import { ActionPanel, LogPanel, MarketPanel, PlayersPanel, TurnTimer } from "./panels";
import { ResultsModal } from "./results/ResultsModal";
import { useGame } from "./useGame";

type SideTab = "players" | "market" | "log" | "chat";

const TABS: { value: SideTab; icon: IconName; label: "game.tabs.players" | "game.tabs.market" | "game.tabs.log" | "game.tabs.chat" }[] = [
  { value: "players", icon: "person", label: "game.tabs.players" },
  { value: "market", icon: "market", label: "game.tabs.market" },
  { value: "log", icon: "log", label: "game.tabs.log" },
  { value: "chat", icon: "chat", label: "game.tabs.chat" },
];

/**
 * Game screen. Desktop: board + side panel. Mobile: full-height board with the action bar at
 * the bottom and the panels in a sheet that slides up when a tab is tapped.
 */
export function GameView() {
  const t = useT();
  const navigate = useNavigate();
  const { game, current, myTurn, view } = useGame();
  const { leave, password } = useSession();
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<SideTab>("players");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(true);
  const phase = game.turn.phase;
  const chatLength = view.room.chat.length;
  const [chatSeen, setChatSeen] = useState(chatLength);
  const chatVisible = tab === "chat" && (sheetOpen || isDesktop());

  // Jump to the market when it is our turn to pick, back to players afterwards.
  useEffect(() => {
    if (myTurn && phase === "pick") {
      setTab("market");
      setSheetOpen(true);
    } else {
      setTab((tab) => {
        // After picking, give the board its room back on small screens.
        if (tab === "market") setSheetOpen(false);
        return tab === "market" ? "players" : tab;
      });
    }
  }, [myTurn, phase]);
  useEffect(() => setSelected(null), [game.turn.playerIndex, phase]);
  useEffect(() => {
    if (chatVisible) setChatSeen(chatLength);
  }, [chatVisible, chatLength]);

  const chooseTab = (value: SideTab) => {
    // On mobile, tapping the open tab closes the sheet.
    if (value === tab && sheetOpen) setSheetOpen(false);
    else {
      setTab(value);
      setSheetOpen(true);
    }
  };

  const quit = async () => {
    const ok = await confirmDialog({ title: t("game.leave"), message: t("game.leaveConfirm"), confirmLabel: t("game.leave"), cancelLabel: t("common.cancel"), danger: true });
    if (!ok) return;
    leave();
    navigate("/");
  };

  const exportSave = () => downloadJson(`smallworld-${game.id}.json`, { id: game.id, code: view.room.code, password, game, savedAt: Date.now() });
  const showUnread = chatLength > chatSeen && !chatVisible;

  return (
    <div className="flex h-[100dvh] flex-col">
      <Header>
        <span className="badge hidden whitespace-nowrap min-[420px]:inline-flex">{t("game.turnShort", { turn: Math.min(game.turn.number, game.settings.turns), turns: game.settings.turns })}</span>
        {phase !== "finished" && (
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: playerColor(current.color) }} />
            <span className="truncate">{myTurn ? <><span className="sm:hidden">{t("game.yourTurnShort")}</span><span className="hidden sm:inline">{t("game.yourTurn")}</span></> : current.name}</span>
          </span>
        )}
        <TurnTimer />
        <span className="ml-auto hidden font-mono text-xs text-text-muted md:inline">{view.room.code}</span>
        {phase === "finished" && (
          <Button variant="primary" size="sm" onClick={() => setResultsOpen(true)}>
            <Icon name="trophy" /> <span className="hidden sm:inline">{t("game.results")}</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setRulesOpen(true)} title={t("home.rules")} aria-label={t("home.rules")}>
          <Icon name="scroll" className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={exportSave} title={t("game.saveFile")} aria-label={t("game.saveFile")}>
          <Icon name="save" className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={quit} title={t("game.leave")} aria-label={t("game.leave")}>
          <Icon name="exit" className="h-5 w-5" />
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-0 flex-1 bg-canvas">
          <Ambiance extensions={game.settings.extensions} />
          <Board selected={selected} onSelect={setSelected} />
        </main>
        <aside className="surface flex max-h-[58dvh] shrink-0 flex-col border-x-0 border-b-0 lg:max-h-none lg:w-96 lg:border-y-0 lg:border-l lg:border-r-0">
          <section className={cx("border-b border-border p-3 lg:p-4", myTurn && "bg-accent/10")}>
            <ActionPanel selected={selected} onSelect={setSelected} />
          </section>
          <nav className="flex shrink-0 border-b border-border px-1" role="tablist">
            {TABS.map((item) => {
              const active = tab === item.value && (sheetOpen || isDesktop());
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => chooseTab(item.value)}
                  className={cx(
                    "relative -mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm",
                    active ? "border-accent text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
                  )}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  <span className="hidden min-[380px]:inline">{t(item.label)}</span>
                  {item.value === "chat" && showUnread && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-pill bg-danger" />}
                </button>
              );
            })}
            <button
              type="button"
              className="px-2 text-text-muted lg:hidden"
              onClick={() => setSheetOpen(!sheetOpen)}
              aria-label={sheetOpen ? t("game.collapse") : t("game.expand")}
            >
              <Icon name={sheetOpen ? "contract" : "expand"} className="h-4 w-4" />
            </button>
          </nav>
          <div className={cx("scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3 lg:block", sheetOpen ? "block" : "hidden")}>
            {tab === "players" && <PlayersPanel />}
            {tab === "market" && <MarketPanel />}
            {tab === "log" && <LogPanel />}
            {tab === "chat" && <ChatPanel className="h-full min-h-[14rem]" />}
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

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
