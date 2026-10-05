import { useState } from "react";
import { EVENT_ART } from "@/features/extensions/art";
import { useT } from "@/i18n";
import { Icon } from "@/ui/icons/Icon";
import { useGame } from "./useGame";

/** The current turn's event ("legends" extension), floating over the board; tap for details. */
export function EventBadge() {
  const t = useT();
  const { game } = useGame();
  const [open, setOpen] = useState(false);
  const event = game.event;
  if (!event || game.turn.phase === "finished") return null;
  const art = EVENT_ART[event];

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      title={t("game.info.event")}
      className="card absolute bottom-2 left-2 flex max-w-[min(18rem,calc(100%-4rem))] items-start gap-2 p-1.5 pr-2.5 text-left text-xs shadow-overlay transition-colors hover:bg-surface-hover sm:bottom-3 sm:left-3"
    >
      <span key={event} className="fx-pop inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill p-1 text-white ring-2 ring-white/70" style={{ background: art.color }}>
        <Icon name={art.icon} className="h-full w-full" />
      </span>
      <span className="min-w-0 self-center">
        <span className="block font-semibold leading-tight">{t.dyn(`event.${event}.name`)}</span>
        {open && <span className="mt-0.5 block text-text-secondary">{t.dyn(`event.${event}.desc`)}</span>}
      </span>
    </button>
  );
}
