import { useState } from "react";
import { RaceEmblem } from "@/features/cards/Cards";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { raceName } from "./text";
import { useGame } from "./useGame";

/** Who is who on the map: player colour + active/declined race, floating over the board. */
export function MapLegend() {
  const t = useT();
  const { game, current } = useGame();
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);

  return (
    <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
      <div className="card overflow-hidden text-xs shadow-overlay">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 font-semibold text-text-secondary hover:bg-surface-hover"
          aria-expanded={open}
        >
          <Icon name="person" />
          <span className={cx(!open && "sr-only")}>{t("game.legend")}</span>
          {!open && (
            <span className="flex -space-x-1">
              {game.players.map((p) => (
                <span key={p.id} className="h-3 w-3 rounded-pill ring-2 ring-surface" style={{ background: playerColor(p.color) }} />
              ))}
            </span>
          )}
          <Icon name={open ? "contract" : "expand"} className="ml-auto h-3 w-3" />
        </button>
        {open && (
          <ul className="space-y-1 border-t border-border px-2.5 py-2">
            {game.players.map((p) => (
              <li key={p.id} className={cx("flex items-center gap-2", p.id === current.id && "font-semibold")}>
                <span className="h-3 w-3 shrink-0 rounded-pill" style={{ background: playerColor(p.color) }} />
                <span className="max-w-[7rem] truncate">{p.name}</span>
                <span className="ml-auto flex items-center gap-1">
                  {p.active && (
                    <span title={raceName(t, p.active.race)}>
                      <RaceEmblem race={p.active.race} size="xs" />
                    </span>
                  )}
                  {p.declined && (
                    <span title={`${t("game.declinedRace")} : ${raceName(t, p.declined.race)}`}>
                      <RaceEmblem race={p.declined.race} size="xs" muted />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
