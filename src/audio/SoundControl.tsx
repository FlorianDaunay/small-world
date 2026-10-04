import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { Icon } from "@/ui/icons/Icon";
import { playSound, useSoundSettings } from "./sound";

/** Volume slider + mute switch (used in the header popover and in the settings). */
export function SoundSettings() {
  const t = useT();
  const { volume, muted, setVolume, toggleMuted } = useSoundSettings();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="btn btn-icon"
        onClick={toggleMuted}
        aria-pressed={muted}
        aria-label={muted ? t("sound.unmute") : t("sound.mute")}
        title={muted ? t("sound.unmute") : t("sound.mute")}
      >
        <Icon name={muted ? "speakerOff" : "speaker"} className="h-5 w-5" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        aria-label={t("sound.volume")}
        className="h-2 w-full cursor-pointer accent-[rgb(var(--color-accent))]"
        onChange={(e) => setVolume(Number(e.target.value) / 100)}
        onPointerUp={() => playSound("coin")}
        onKeyUp={() => playSound("click")}
      />
      <span className="w-10 text-right font-mono text-xs tabular-nums text-text-muted">{muted ? "—" : `${Math.round(volume * 100)}%`}</span>
    </div>
  );
}

/** Header button: click toggles a small volume popover. */
export function SoundControl() {
  const t = useT();
  const muted = useSoundSettings((s) => s.muted || s.volume === 0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={t("sound.title")}
        title={t("sound.title")}
      >
        <Icon name={muted ? "speakerOff" : "speaker"} className="h-5 w-5" />
      </button>
      {open && (
        <div className="card animate-pop absolute right-0 top-11 z-40 w-64 p-3 shadow-overlay">
          <p className="label">{t("sound.title")}</p>
          <SoundSettings />
        </div>
      )}
    </div>
  );
}
