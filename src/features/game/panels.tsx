import { useEffect, useRef, useState } from "react";
import { playSound } from "@/audio/sound";
import { MAX_FORTRESSES, POWERS, RACES, canDecline, conquestCost, regionsOf, scoreBreakdown, type PlayerState } from "@/core/game";
import { ComboCard, ComboChip, PowerEmblem, RaceEmblem, TokenPill } from "@/features/cards/Cards";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { confirmDialog } from "@/ui/feedback";
import { cx } from "@/ui/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import { describeLog, powerName, raceName } from "./text";
import { useGame } from "./useGame";

// ------------------------------------------------------------------ action panel

/** Screens without hover (phones, tablets) get touch-specific hints. */
const isTouchScreen = () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

/** What the local player can do now, with a hint for the current phase. */
export function ActionPanel({ selected, onSelect }: { selected: number | null; onSelect: (r: number | null) => void }) {
  const t = useT();
  const { game, self, current, myTurn, targets, myRegions, dispatch, topology, isHost } = useGame();
  const session = useSession((s) => s.session);
  const { phase } = game.turn;
  const active = self?.active;
  const touch = isTouchScreen();

  if (phase === "finished") return <p className="text-sm font-semibold">{t("game.phase.finished")}</p>;

  if (!myTurn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-pill" style={{ background: playerColor(current.color) }} />
        <p className="flex-1 text-sm text-text-secondary">{t("game.phase.waiting", { player: current.name })}</p>
        {isHost && !current.connected && (
          <Button size="sm" variant="danger" onClick={() => session?.skipTurn()}>
            {t("game.actions.skip")}
          </Button>
        )}
      </div>
    );
  }

  const selectedCost = selected != null && targets.has(selected) ? conquestCost(game, topology, selected) : null;
  const canConquer = phase === "conquer" && selectedCost != null && !!active && active.hand >= selectedCost;
  const canRoll = phase === "conquer" && selectedCost != null && !!active && active.hand > 0 && active.hand < selectedCost;
  const canAbandon = phase === "conquer" && game.turn.conquests === 0 && selected != null && myRegions.has(selected);
  const ownSelected = phase === "redeploy" && selected != null && myRegions.has(selected);
  const canFortress = ownSelected && !!active && POWERS[active.power].fortresses && !game.turn.fortressPlaced && !game.regions[selected!].fortress;

  const decline = async () => {
    const ok = await confirmDialog({ title: t("game.actions.decline"), message: t("game.actions.declineConfirm"), confirmLabel: t("common.confirm"), cancelLabel: t("common.cancel") });
    if (ok) dispatch({ type: "decline" });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{t.dyn(`game.phase.${phase}${touch && phase !== "pick" ? "Touch" : ""}`)}</p>
        {active && phase !== "pick" && (
          <span className="badge text-sm font-semibold text-text-primary" title={t("game.hand", { count: active.hand })}>
            <Icon name="hand" className="h-4 w-4" /> {active.hand}
          </span>
        )}
        {game.lastRoll && (
          <span className={cx("badge", game.lastRoll.success ? "text-success" : "text-danger")}>
            <Icon name="dice" /> {game.lastRoll.value}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canConquer && (
          <Button variant="primary" onClick={() => (dispatch({ type: "conquer", region: selected! }), onSelect(null))}>
            <Icon name="swords" /> {t("game.actions.conquer", { cost: selectedCost! })}
          </Button>
        )}
        {canRoll && (
          <Button variant="primary" onClick={() => (dispatch({ type: "roll", region: selected! }), onSelect(null))}>
            <Icon name="dice" /> {t("game.actions.roll", { hand: active!.hand, cost: selectedCost! })}
          </Button>
        )}
        {canAbandon && (
          <Button size="sm" onClick={() => (dispatch({ type: "abandon", region: selected! }), onSelect(null))}>
            {t("game.actions.abandon")}
          </Button>
        )}
        {ownSelected && (
          <span className="inline-flex items-center gap-1 rounded-control border border-border p-0.5">
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "deploy", region: selected!, delta: -1 })} aria-label="-1">
              −1
            </Button>
            <span className="px-1 font-mono text-sm font-semibold tabular-nums">{game.regions[selected!].tokens}</span>
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "deploy", region: selected!, delta: 1 })} aria-label="+1">
              +1
            </Button>
          </span>
        )}
        {canFortress && (
          <Button size="sm" onClick={() => dispatch({ type: "fortress", region: selected! })}>
            <Icon name="fortress" /> {t("game.actions.fortress")}
          </Button>
        )}
        {canDecline(game) && (
          <Button variant="danger" size="sm" onClick={decline}>
            <Icon name="decline" /> {t("game.actions.decline")}
          </Button>
        )}
        {phase === "conquer" && (
          <Button variant={canConquer || canRoll ? "default" : "primary"} onClick={() => dispatch({ type: "endConquest" })}>
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

// ------------------------------------------------------------------ players (info zone)

function Stat({ icon, label, value, tone }: { icon: IconName; label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-control bg-surface-hover/60 px-2 py-1" title={label}>
      <Icon name={icon} className={cx("h-3.5 w-3.5 text-text-muted", tone)} />
      <span className="sr-only">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerState }) {
  const t = useT();
  const { game, me, current } = useGame();
  const [open, setOpen] = useState(false);
  const isCurrent = player.id === current.id && game.turn.phase !== "finished";
  const activeRegions = regionsOf(game, player.id, false);
  const declinedRegions = regionsOf(game, player.id, true);
  const onBoard = activeRegions.reduce((sum, r) => sum + game.regions[r].tokens, 0);
  const projected = scoreBreakdown(game, player);
  const lastEarned = player.history[player.history.length - 1];
  const fortresses = game.regions.filter((r) => r.owner === player.id && r.fortress).length;

  return (
    <li className={cx("overflow-hidden rounded-tile border bg-canvas", isCurrent ? "border-accent ring-1 ring-accent" : "border-border")}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-2.5 text-left hover:bg-surface-hover/50" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 shrink-0 rounded-pill ring-2 ring-surface" style={{ background: playerColor(player.color) }} />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {player.name}
            {player.id === me && <span className="font-normal text-text-muted"> ({t("common.you")})</span>}
          </span>
          {isCurrent && <span className="badge border-accent text-accent">{t("game.playing")}</span>}
          {!player.connected && <span className="badge text-warning">{t("common.away")}</span>}
          <span className="flex items-center gap-1 font-mono text-base font-bold tabular-nums" title={t("game.coins", { count: player.coins })}>
            <Icon name="coins" className="h-4 w-4 text-warning" />
            {player.coins}
          </span>
        </div>
        <div className="mt-2 space-y-1.5 text-xs">
          {player.active ? <ComboChip race={player.active.race} power={player.active.power} /> : <p className="italic text-text-muted">{t("game.noRace")}</p>}
          {player.declined && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Icon name="decline" className="h-3.5 w-3.5" />
              <ComboChip race={player.declined.race} power={player.declined.power} declined />
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Stat icon="map" label={t("game.info.regions")} value={declinedRegions.length ? `${activeRegions.length}+${declinedRegions.length}` : activeRegions.length} />
          <Stat icon="tokens" label={t("game.info.onBoard")} value={onBoard} />
          {player.active && <Stat icon="hand" label={t("game.info.hand")} value={player.active.hand} />}
          {fortresses > 0 && <Stat icon="fortress" label={t("game.info.fortresses")} value={`${fortresses}/${MAX_FORTRESSES}`} />}
          {lastEarned !== undefined && <Stat icon="coins" label={t("game.info.lastTurn")} value={`+${lastEarned}`} />}
          {isCurrent && <Stat icon="target" label={t("game.info.projected")} value={`+${projected.total}`} tone="text-accent" />}
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border bg-surface-hover/30 p-2.5 text-xs">
          {player.active && (
            <>
              <Detail emblem={<RaceEmblem race={player.active.race} size="sm" />} title={raceName(t, player.active.race)} text={t.dyn(`race.${player.active.race}.desc`)} />
              <Detail emblem={<PowerEmblem power={player.active.power} size="sm" />} title={powerName(t, player.active.power)} text={t.dyn(`power.${player.active.power}.desc`)} />
            </>
          )}
          {isCurrent && (
            <p className="text-text-secondary">
              {t("game.info.breakdown", { regions: projected.regions, race: projected.race, power: projected.power })}
            </p>
          )}
          {player.stats.races.length > 0 && (
            <div>
              <p className="label mb-1">{t("game.info.history")}</p>
              <div className="flex flex-wrap gap-1">
                {player.stats.races.map((r, i) => (
                  <span key={i} className="badge" title={t("game.info.pickedAt", { turn: r.turn })}>
                    <RaceEmblem race={r.race} size="xs" className="h-4 w-4 ring-0" /> {raceName(t, r.race)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ emblem, title, text }: { emblem: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-2">
      {emblem}
      <p className="text-text-secondary">
        <strong className="text-text-primary">{title}</strong> — {text}
      </p>
    </div>
  );
}

/** Turn summary + one rich card per player (click a card for details). */
export function PlayersPanel() {
  const t = useT();
  const { game } = useGame();
  const { turn } = game;
  return (
    <div className="space-y-3">
      {turn.phase !== "finished" && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <InfoTile label={t("game.info.turn")} value={`${turn.number}/${game.settings.turns}`} />
          <InfoTile label={t("game.info.conquests")} value={turn.conquests} />
          <InfoTile label={t("game.info.market")} value={game.market.length} />
        </div>
      )}
      <ul className="space-y-2">
        {game.players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </ul>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-tile border border-border bg-canvas px-2 py-1.5">
      <p className="font-mono text-base font-bold tabular-nums">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

// ------------------------------------------------------------------ market

export function MarketPanel() {
  const t = useT();
  const { game, self, myTurn, dispatch } = useGame();
  const canPick = myTurn && game.turn.phase === "pick";
  return (
    <ul className="space-y-2.5">
      {game.market.map((combo, index) => {
        const affordable = (self?.coins ?? 0) >= index;
        return (
          <li key={`${combo.race}-${combo.power}`}>
            <ComboCard
              race={combo.race}
              power={combo.power}
              highlight={canPick && index === 0}
              footer={
                <>
                  <TokenPill count={POWERS[combo.power].tokens + RACES[combo.race].tokens} />
                  {combo.coins > 0 && (
                    <span className="badge text-success">
                      <Icon name="coins" /> +{combo.coins}
                    </span>
                  )}
                  <span className={cx("flex-1 text-right", affordable ? "text-text-muted" : "text-danger")}>{t("game.pickCost", { count: index })}</span>
                  {canPick && (
                    <Button size="sm" variant="primary" disabled={!affordable} onClick={() => dispatch({ type: "pick", index })}>
                      {t("game.pick")}
                    </Button>
                  )}
                </>
              }
            />
          </li>
        );
      })}
    </ul>
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
  const { game, myTurn } = useGame();
  const deadline = game.turn.deadline;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  // Ticking during the last ten seconds of our own turn.
  useEffect(() => {
    if (deadline && myTurn && left > 0 && left <= 10) playSound("tick");
  }, [left, deadline, myTurn]);
  if (!deadline) return null;
  const urgent = left <= 15;
  return (
    <span className={cx("badge font-mono tabular-nums", urgent && "border-danger text-danger")} title={t("game.timeLeft")}>
      <Icon name="stopwatch" /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}
