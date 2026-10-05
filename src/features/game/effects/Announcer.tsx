import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EventId, LogEntry, PowerId, RaceId } from "@/core/game";
import { PowerEmblem, RaceEmblem } from "@/features/cards/Cards";
import { EVENT_ART } from "@/features/extensions/art";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { comboName } from "../text";
import { useGame } from "../useGame";
import { entryId, useLogStream } from "./useLogStream";

interface Banner {
  id: string;
  /** How long it stays on screen, in ms. */
  duration: number;
  tone: "accent" | "neutral" | "success" | "danger";
  content: ReactNode;
}

const MAX_QUEUE = 5;

/**
 * Banners at the top of the board announcing what just happened (whose turn it is, picks,
 * declines, coins earned, the turn's event), shown one after the other. Derived from the
 * game log, like the sounds.
 */
export function Announcer() {
  const t = useT();
  const { game, me } = useGame();
  const [queue, setQueue] = useState<Banner[]>([]);
  const current = queue[0];

  const dot = (name: unknown) => {
    const player = game.players.find((p) => p.name === name);
    return player ? <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: playerColor(player.color) }} /> : null;
  };

  const toBanner = (entry: LogEntry, index: number): Banner | null => {
    const p = entry.params ?? {};
    const id = entryId(entry, index);
    const mine = game.players.find((pl) => pl.name === p.player)?.id === me;
    switch (entry.key) {
      case "turnStarted":
        return {
          id,
          duration: mine ? 1800 : 1400,
          tone: mine ? "accent" : "neutral",
          content: (
            <>
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">{t("fx.round", { turn: p.turn })}</span>
              <span className="flex items-center gap-2 text-base font-bold sm:text-lg">
                {dot(p.player)} {mine ? t("fx.yourTurn") : t("fx.turnOf", { player: p.player })}
              </span>
            </>
          ),
        };
      case "picked":
        return {
          id,
          duration: 1800,
          tone: "neutral",
          content: (
            <span className="flex items-center gap-2.5">
              <span className="relative inline-flex">
                <RaceEmblem race={p.race as RaceId} size="md" />
                <PowerEmblem power={p.power as PowerId} size="xs" className="absolute -bottom-1 -right-1.5 h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                  {dot(p.player)} {t("fx.picked", { player: p.player })}
                </span>
                <span className="block font-bold">{comboName(t, p.race as RaceId, p.power as PowerId)}</span>
              </span>
            </span>
          ),
        };
      case "declined":
        return {
          id,
          duration: 1600,
          tone: "neutral",
          content: (
            <span className="flex items-center gap-2 font-semibold">
              <Icon name="decline" className="h-5 w-5 text-text-muted" /> {t("fx.declined", { player: p.player })}
            </span>
          ),
        };
      case "scored":
        return {
          id,
          duration: 1500,
          tone: "success",
          content: (
            <span className="flex items-center gap-2 font-semibold">
              {dot(p.player)} {t("fx.scored", { player: p.player })}
              <span className="fx-coin-burst inline-flex items-center gap-1 font-mono text-lg font-bold text-warning">
                <Icon name="coins" className="h-5 w-5" />+{p.total}
              </span>
            </span>
          ),
        };
      case "reinforced":
        return {
          id,
          duration: 1300,
          tone: "success",
          content: (
            <span className="flex items-center gap-2 font-semibold">
              {dot(p.player)} <Icon name="tokens" className="h-4 w-4" /> {t("fx.reinforced", { count: p.count })}
            </span>
          ),
        };
      case "event": {
        const event = p.event as EventId;
        const art = EVENT_ART[event];
        if (!art) return null;
        return {
          id,
          duration: 3200,
          tone: "accent",
          content: (
            <span className="flex items-center gap-3 text-left">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill p-1.5 text-white ring-2 ring-white/70" style={{ background: art.color }}>
                <Icon name={art.icon} className="h-full w-full" />
              </span>
              <span>
                <span className="block text-xs font-medium uppercase tracking-wide opacity-80">{t("fx.event")}</span>
                <span className="block font-bold">{t.dyn(`event.${event}.name`)}</span>
                <span className="block text-xs opacity-90">{t.dyn(`event.${event}.desc`)}</span>
              </span>
            </span>
          ),
        };
      }
      default:
        return null;
    }
  };

  useLogStream(game.log, (entries) => {
    const banners = entries.map(toBanner).filter((b): b is Banner => b !== null);
    // Under a burst of events (several turns at once after a reconnection), keep the latest.
    if (banners.length) setQueue((q) => [...q, ...banners].slice(-MAX_QUEUE));
  });

  const timer = useRef<number>();
  useEffect(() => {
    if (!current) return;
    timer.current = window.setTimeout(() => setQueue((q) => q.slice(1)), current.duration);
    return () => clearTimeout(timer.current);
  }, [current]);

  if (!current) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-3 sm:top-3" role="status" aria-live="polite">
      <div
        key={current.id}
        className={cx(
          "fx-banner flex max-w-full flex-col items-center gap-0.5 rounded-card border px-4 py-2 text-center shadow-overlay backdrop-blur-sm",
          current.tone === "accent" && "border-accent bg-accent text-accent-foreground",
          current.tone === "neutral" && "border-border bg-surface/95",
          current.tone === "success" && "border-success/50 bg-surface/95",
          current.tone === "danger" && "border-danger/50 bg-surface/95"
        )}
        style={{ animationDuration: `${current.duration}ms` }}
      >
        {current.content}
      </div>
    </div>
  );
}
