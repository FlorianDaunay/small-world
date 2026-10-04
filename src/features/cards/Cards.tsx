import type { ReactNode } from "react";
import { POWERS, RACES, type PowerId, type RaceId } from "@/core/game";
import { comboName, powerName, raceName } from "@/features/game/text";
import { useT } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import { POWER_ART, RACE_ART } from "./art";

const SIZES = { xs: "h-5 w-5 p-0.5", sm: "h-7 w-7 p-1", md: "h-10 w-10 p-1.5", lg: "h-14 w-14 p-2" } as const;

/** Round medallion: white icon on the card's colour, with a soft inner highlight. */
export function Emblem({ icon, color, size = "md", muted, className }: { icon: IconName; color: string; size?: keyof typeof SIZES; muted?: boolean; className?: string }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-pill text-white ring-2 ring-white/70", SIZES[size], muted && "grayscale", className)}
      style={{ background: `radial-gradient(circle at 30% 25%, ${color}CC, ${color} 60%, ${color}F0)`, boxShadow: "inset 0 -2px 4px rgb(0 0 0 / 0.25), 0 1px 2px rgb(0 0 0 / 0.2)" }}
      aria-hidden
    >
      <Icon name={icon} className="h-full w-full drop-shadow-sm" />
    </span>
  );
}

export const RaceEmblem = ({ race, ...props }: { race: RaceId; size?: keyof typeof SIZES; muted?: boolean; className?: string }) => (
  <Emblem icon={RACE_ART[race].icon} color={RACE_ART[race].color} {...props} />
);

export const PowerEmblem = ({ power, ...props }: { power: PowerId; size?: keyof typeof SIZES; muted?: boolean; className?: string }) => (
  <Emblem icon={POWER_ART[power].icon} color={POWER_ART[power].color} {...props} />
);

/** Token count pill. */
export function TokenPill({ count, prefix = "", className }: { count: number; prefix?: string; className?: string }) {
  const t = useT();
  return (
    <span className={cx("badge font-mono tabular-nums", className)} title={t("cards.tokens")}>
      <Icon name="tokens" className="h-3.5 w-3.5" />
      {prefix}
      {count}
    </span>
  );
}

/**
 * A race + power combo, styled like the board game's stacked tiles: the power banner sits on
 * top of the race plate. Used by the market.
 */
export function ComboCard({ race, power, footer, highlight }: { race: RaceId; power: PowerId; footer?: ReactNode; highlight?: boolean }) {
  const t = useT();
  const raceArt = RACE_ART[race];
  const powerArt = POWER_ART[power];
  return (
    <article className={cx("overflow-hidden rounded-tile border bg-canvas shadow-card transition-shadow", highlight ? "border-accent ring-1 ring-accent" : "border-border")}>
      <header className="flex items-center gap-2 px-2.5 py-1.5 text-white" style={{ background: `linear-gradient(90deg, ${powerArt.color}, ${powerArt.color}D0)` }}>
        <Icon name={powerArt.icon} className="h-4 w-4 drop-shadow" />
        <span className="flex-1 truncate text-xs font-bold uppercase tracking-wide drop-shadow">{powerName(t, power)}</span>
        <span className="rounded-pill bg-black/25 px-1.5 font-mono text-[11px] font-semibold">+{POWERS[power].tokens}</span>
      </header>
      <div className="flex gap-3 p-2.5" style={{ background: `linear-gradient(135deg, ${raceArt.color}22, transparent 65%)` }}>
        <RaceEmblem race={race} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="flex-1 truncate text-sm font-bold leading-tight" title={comboName(t, race, power)}>
              {raceName(t, race)}
            </h4>
            <span className="font-mono text-xs font-semibold text-text-secondary">{RACES[race].tokens}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{t.dyn(`race.${race}.desc`)}</p>
          <p className="mt-1 text-[11px] leading-snug text-text-secondary">
            <span className="font-semibold" style={{ color: "rgb(var(--color-text-primary))" }}>
              {powerName(t, power)} :
            </span>{" "}
            {t.dyn(`power.${power}.desc`)}
          </p>
        </div>
      </div>
      {footer && <footer className="flex items-center gap-2 border-t border-border px-2.5 py-1.5 text-xs">{footer}</footer>}
    </article>
  );
}

/** Compact "emblem + name" for player panels; the power shows as a small overlapping emblem. */
export function ComboChip({ race, power, declined, className }: { race: RaceId; power: PowerId; declined?: boolean; className?: string }) {
  const t = useT();
  return (
    <span className={cx("inline-flex min-w-0 items-center gap-2", className)} title={`${t.dyn(`race.${race}.desc`)}\n${t.dyn(`power.${power}.desc`)}`}>
      <span className="relative inline-flex">
        <RaceEmblem race={race} size="sm" muted={declined} />
        <PowerEmblem power={power} size="xs" muted={declined} className="absolute -bottom-1 -right-1.5 h-4 w-4 p-[1px] ring-1" />
      </span>
      <span className={cx("truncate", declined && "text-text-muted")}>{comboName(t, race, power)}</span>
    </span>
  );
}

/** Catalogue tile for the rules page. */
export function CatalogueCard({ kind, id }: { kind: "race"; id: RaceId } | { kind: "power"; id: PowerId }) {
  const t = useT();
  const art = kind === "race" ? RACE_ART[id] : POWER_ART[id];
  const tokens = kind === "race" ? RACES[id].tokens : POWERS[id].tokens;
  return (
    <li className="flex gap-3 rounded-tile border border-border bg-canvas p-3" style={{ background: `linear-gradient(135deg, ${art.color}1F, transparent 60%)` }}>
      <Emblem icon={art.icon} color={art.color} size="md" />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold">
          <span className="first-letter:uppercase">{t.dyn(`${kind}.${id}.name`)}</span>
          <TokenPill count={tokens} prefix={kind === "power" ? "+" : ""} />
        </p>
        <p className="text-xs text-text-secondary">{t.dyn(`${kind}.${id}.desc`)}</p>
      </div>
    </li>
  );
}
