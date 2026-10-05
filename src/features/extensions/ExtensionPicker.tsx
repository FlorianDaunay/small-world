import { EVENT_IDS, EXTENSIONS, EXTENSION_IDS, conflictsOf, type ExtensionId } from "@/core/game";
import { PowerEmblem, RaceEmblem } from "@/features/cards/Cards";
import { powerName, raceName } from "@/features/game/text";
import { useT } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { EVENT_ART, EXTENSION_ART } from "./art";

/** Large round emblem on the extension's two colours. */
export function ExtensionEmblem({ id, size = "md", className }: { id: ExtensionId; size?: "sm" | "md"; className?: string }) {
  const { icon, colors } = EXTENSION_ART[id];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-pill text-white ring-2 ring-white/70",
        size === "md" ? "h-12 w-12 p-2" : "h-6 w-6 p-1",
        className
      )}
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`, boxShadow: "inset 0 -2px 4px rgb(0 0 0 / 0.25), 0 1px 3px rgb(0 0 0 / 0.25)" }}
      aria-hidden
    >
      <Icon name={icon} className="h-full w-full drop-shadow-sm" />
    </span>
  );
}

/** What an extension brings, as small emblems and tags. */
export function ExtensionContent({ id }: { id: ExtensionId }) {
  const t = useT();
  const def = EXTENSIONS[id];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {def.races.map((race) => (
        <span key={race} title={raceName(t, race)}>
          <RaceEmblem race={race} size="xs" />
        </span>
      ))}
      {def.powers.map((power) => (
        <span key={power} title={powerName(t, power)}>
          <PowerEmblem power={power} size="xs" />
        </span>
      ))}
      {def.races.length > 0 && <span className="badge">{t("create.extensionRaces", { count: def.races.length })}</span>}
      {def.powers.length > 0 && <span className="badge">{t("create.extensionPowers", { count: def.powers.length })}</span>}
      {def.events && (
        <>
          <span className="flex -space-x-1">
            {EVENT_IDS.slice(0, 5).map((e) => (
              <span key={e} className="inline-flex h-5 w-5 items-center justify-center rounded-pill p-0.5 text-white ring-2 ring-surface" style={{ background: EVENT_ART[e].color }}>
                <Icon name={EVENT_ART[e].icon} className="h-full w-full" />
              </span>
            ))}
          </span>
          <span className="badge">{t("create.extensionEvents", { count: EVENT_IDS.length })}</span>
        </>
      )}
      {def.rules && <span className="badge">{t("create.extensionRules")}</span>}
    </div>
  );
}

/**
 * Extension tiles for the game creation form. Any number can be chosen; choosing one that
 * contradicts a selected one (e.g. two seasons) swaps them.
 */
export function ExtensionPicker({ value, onChange }: { value: ExtensionId[]; onChange: (next: ExtensionId[]) => void }) {
  const t = useT();
  const toggle = (id: ExtensionId) => {
    if (value.includes(id)) onChange(value.filter((e) => e !== id));
    else onChange(EXTENSION_IDS.filter((e) => e === id || (value.includes(e) && !conflictsOf(id, [e]).length)));
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {EXTENSION_IDS.map((id) => {
        const on = value.includes(id);
        const conflicts = conflictsOf(id, value);
        const [main, second] = EXTENSION_ART[id].colors;
        return (
          <button
            key={id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(id)}
            className={cx(
              "group relative flex flex-col overflow-hidden rounded-tile border bg-canvas text-left shadow-card transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-overlay focus-visible:-translate-y-0.5",
              on ? "border-transparent" : "border-border"
            )}
            style={on ? { boxShadow: `0 0 0 2px ${main}, 0 6px 18px -6px ${main}99` } : undefined}
          >
            <span
              className={cx("absolute inset-0 transition-opacity duration-300", on ? "opacity-100" : "opacity-40 group-hover:opacity-70")}
              style={{ background: `linear-gradient(135deg, ${main}2E, ${second}14 55%, transparent 85%)` }}
              aria-hidden
            />
            <span className="relative flex items-start gap-3 p-3">
              <ExtensionEmblem id={id} className={cx("transition-transform duration-300", on && "scale-105")} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight">{t.dyn(`extension.${id}.name`)}</span>
                <span className="mt-0.5 block text-xs italic text-text-secondary">{t.dyn(`extension.${id}.tagline`)}</span>
              </span>
              <span
                className={cx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2 transition-colors",
                  on ? "border-transparent text-white" : "border-border text-transparent"
                )}
                style={on ? { background: main } : undefined}
              >
                <Icon name="check" className="h-3.5 w-3.5" />
              </span>
            </span>
            <span className="relative space-y-2 px-3 pb-3 text-xs">
              <span className="block leading-snug text-text-secondary">{t.dyn(`extension.${id}.desc`)}</span>
              <ExtensionContent id={id} />
              {conflicts.length > 0 && (
                <span className="flex items-center gap-1 font-medium text-warning">
                  <Icon name="info" /> {t("create.extensionConflict", { name: conflicts.map((c) => t.dyn(`extension.${c}.name`)).join(", ") })}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact list of the extensions in play (lobby, game). */
export function ExtensionBadges({ extensions, className }: { extensions: readonly ExtensionId[]; className?: string }) {
  const t = useT();
  if (!extensions.length) return <span className={cx("text-text-muted", className)}>{t("create.extensionsBase")}</span>;
  return (
    <span className={cx("inline-flex flex-wrap justify-end gap-1.5", className)}>
      {extensions.map((id) => (
        <span key={id} className="badge" title={t.dyn(`extension.${id}.desc`)}>
          <ExtensionEmblem id={id} size="sm" className="-ml-1.5 h-5 w-5 ring-1" />
          {t.dyn(`extension.${id}.name`)}
        </span>
      ))}
    </span>
  );
}
