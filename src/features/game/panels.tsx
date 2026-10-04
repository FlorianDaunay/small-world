import { useEffect, useRef, useState } from "react";
import { POWERS, RACES, canDecline, conquestCost, scoreBreakdown, type Combo } from "@/core/game";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { confirmDialog } from "@/ui/feedback";
import { cx } from "@/ui/cx";
import { comboName, describeLog, powerName, raceName } from "./text";
import { useGame } from "./useGame";

// ------------------------------------------------------------------ action panel

/** What the local player can do now, with a hint for the current phase. */
export function ActionPanel({ selected, onSelect }: { selected: number | null; onSelect: (r: number | null) => void }) {
  const t = useT();
  const { game, self, current, myTurn, targets, myRegions, dispatch, topology, isHost } = useGame();
  const session = useSession((s) => s.session);
  const { phase } = game.turn;
  const active = self?.active;

  if (phase === "finished") return <p className="text-sm font-semibold">{t("game.phase.finished")}</p>;

  if (!myTurn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">{t("game.phase.waiting", { player: current.name })}</p>
        {isHost && !current.connected && (
          <Button size="sm" variant="danger" onClick={() => session?.skipTurn()}>
            {t("game.actions.skip")}
          </Button>
        )}
      </div>
    );
  }

  const selectedCost = selected != null && targets.has(selected) ? conquestCost(game, topology, selected) : null;
  const canRoll = phase === "conquer" && selectedCost != null && !!active && active.hand > 0 && active.hand < selectedCost;
  const canAbandon = phase === "conquer" && game.turn.conquests === 0 && selected != null && myRegions.has(selected);
  const canFortress =
    phase === "redeploy" && !!active && POWERS[active.power].fortresses && !game.turn.fortressPlaced && selected != null && myRegions.has(selected) && !game.regions[selected].fortress;

  const decline = async () => {
    const ok = await confirmDialog({ title: t("game.actions.decline"), message: t("game.actions.declineConfirm"), confirmLabel: t("common.confirm"), cancelLabel: t("common.cancel") });
    if (ok) dispatch({ type: "decline" });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t.dyn(`game.phase.${phase}`)}</p>
      {active && phase !== "pick" && (
        <p className="text-sm">
          <span className="badge text-sm">✋ {t("game.hand", { count: active.hand })}</span>
        </p>
      )}
      {game.lastRoll && <p className="text-sm">🎲 {t("game.lastRoll", { value: game.lastRoll.value })}</p>}
      <div className="flex flex-wrap gap-2">
        {canRoll && (
          <Button variant="primary" onClick={() => (dispatch({ type: "roll", region: selected! }), onSelect(null))}>
            🎲 {t("game.actions.roll", { hand: active!.hand, cost: selectedCost! })}
          </Button>
        )}
        {canAbandon && (
          <Button size="sm" onClick={() => (dispatch({ type: "abandon", region: selected! }), onSelect(null))}>
            {t("game.actions.abandon")}
          </Button>
        )}
        {canFortress && (
          <Button size="sm" onClick={() => dispatch({ type: "fortress", region: selected! })}>
            🏰 {t("game.actions.fortress")}
          </Button>
        )}
        {canDecline(game) && (
          <Button variant="danger" size="sm" onClick={decline}>
            {t("game.actions.decline")}
          </Button>
        )}
        {phase === "conquer" && (
          <Button variant="primary" onClick={() => dispatch({ type: "endConquest" })}>
            {t("game.actions.endConquest")}
          </Button>
        )}
        {phase === "redeploy" && (
          <Button variant="primary" onClick={() => dispatch({ type: "endTurn" })}>
            {t("game.actions.endTurn")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ players

export function PlayersPanel() {
  const t = useT();
  const { game, me, current } = useGame();
  return (
    <ul className="space-y-2">
      {game.players.map((p) => {
        const score = p.id === current.id ? scoreBreakdown(game, p).total : null;
        return (
          <li
            key={p.id}
            className={cx("rounded-tile border px-3 py-2", p.id === current.id && game.turn.phase !== "finished" ? "border-accent bg-accent/10" : "border-border bg-canvas")}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-pill" style={{ background: playerColor(p.color) }} />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.name}
                {p.id === me && <span className="font-normal text-text-muted"> ({t("common.you")})</span>}
              </span>
              {!p.connected && <span className="badge text-warning">{t("common.away")}</span>}
              <span className="font-mono font-bold tabular-nums" title={t("game.score")}>
                🪙 {p.coins}
              </span>
            </div>
            <div className="mt-1 space-y-0.5 pl-5 text-xs text-text-secondary">
              {p.active ? (
                <p title={`${t.dyn(`race.${p.active.race}.desc`)} — ${t.dyn(`power.${p.active.power}.desc`)}`}>
                  {RACES[p.active.race].icon}
                  {POWERS[p.active.power].icon} {comboName(t, p.active.race, p.active.power)}
                </p>
              ) : (
                <p className="italic text-text-muted">{t("game.noRace")}</p>
              )}
              {p.declined && (
                <p className="text-text-muted">
                  💤 {t("game.declinedRace")} : {raceName(t, p.declined.race)}
                </p>
              )}
              {score != null && game.turn.phase !== "finished" && <p className="text-accent">+{score} 🪙</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------------ market

export function MarketPanel() {
  const t = useT();
  const { game, self, myTurn, dispatch } = useGame();
  const canPick = myTurn && game.turn.phase === "pick";
  return (
    <ul className="space-y-2">
      {game.market.map((combo, index) => (
        <MarketRow key={`${combo.race}-${combo.power}`} combo={combo} index={index} canPick={canPick && (self?.coins ?? 0) >= index} onPick={() => dispatch({ type: "pick", index })} t={t} />
      ))}
    </ul>
  );
}

function MarketRow({ combo, index, canPick, onPick, t }: { combo: Combo; index: number; canPick: boolean; onPick: () => void; t: ReturnType<typeof useT> }) {
  const race = RACES[combo.race];
  const power = POWERS[combo.power];
  return (
    <li className="rounded-tile border border-border bg-canvas p-2.5">
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{race.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{comboName(t, combo.race, combo.power)}</p>
          <p className="text-[11px] leading-snug text-text-muted">
            <strong className="text-text-secondary">{raceName(t, combo.race)}</strong> : {t.dyn(`race.${combo.race}.desc`)}
          </p>
          <p className="text-[11px] leading-snug text-text-muted">
            <strong className="text-text-secondary">
              {power.icon} {powerName(t, combo.power)}
            </strong>{" "}
            : {t.dyn(`power.${combo.power}.desc`)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="badge">🛡️ {race.tokens + power.tokens}</span>
        {combo.coins > 0 && <span className="badge text-success">{t("game.pickGain", { count: combo.coins })}</span>}
        <span className="flex-1 text-right text-text-muted">{t("game.pickCost", { count: index })}</span>
        {canPick && (
          <Button size="sm" variant="primary" onClick={onPick}>
            {t("game.pick")}
          </Button>
        )}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ log

export function LogPanel() {
  const t = useT();
  const { game } = useGame();
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [game.log.length]);
  return (
    <ul ref={list} className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1 text-xs text-text-secondary">
      {game.log.map((entry, i) => (
        <li key={i} className={cx(entry.key === "turnStarted" && "pt-1 font-semibold text-text-primary")}>
          {describeLog(t, entry)}
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ timer

export function TurnTimer() {
  const t = useT();
  const { game } = useGame();
  const deadline = game.turn.deadline;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const urgent = left <= 15;
  return (
    <span className={cx("badge font-mono tabular-nums", urgent && "border-danger text-danger")} title={t("game.timeLeft")}>
      ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}
