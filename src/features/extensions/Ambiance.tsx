import { memo } from "react";
import { EXTENSION_IDS, type ExtensionId } from "@/core/game";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { EXTENSION_ART } from "./art";

/** Where each extension's glow and watermark sit, so that several can be on screen together. */
const SPOTS: Record<ExtensionId, { glow: string; mark: string }> = {
  cursed: { glow: "15% 85%", mark: "left-[-4rem] bottom-[-3rem] rotate-[-14deg]" },
  wilds: { glow: "85% 80%", mark: "right-[-3rem] bottom-[-4rem] rotate-[10deg]" },
  legends: { glow: "50% 0%", mark: "left-1/2 top-[-5rem] -translate-x-1/2 rotate-[4deg]" },
  winter: { glow: "90% 10%", mark: "right-[-4rem] top-[-2rem] rotate-[12deg]" },
  drought: { glow: "10% 10%", mark: "left-[-3rem] top-[-3rem] rotate-[-8deg]" },
};

const PARTICLES = 14;

/** Cheap deterministic "random" in [0, 1) so particles keep their place across renders. */
const noise = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Decorative layer behind a screen: each chosen extension adds a soft coloured glow, a large
 * faded emblem and a few drifting particles (snow, embers…). Layers fade in and out, so
 * toggling an extension visibly changes the mood. Purely visual: hidden from assistive tech,
 * and the particles stop when the system asks for reduced motion.
 */
export const Ambiance = memo(function Ambiance({ extensions, fixed, className }: { extensions: readonly ExtensionId[]; fixed?: boolean; className?: string }) {
  return (
    <div className={cx("pointer-events-none inset-0 overflow-hidden", fixed ? "fixed -z-10" : "absolute", className)} aria-hidden>
      {EXTENSION_IDS.map((id, layer) => {
        const art = EXTENSION_ART[id];
        const on = extensions.includes(id);
        const [main, second] = art.colors;
        return (
          <div key={id} className={cx("absolute inset-0 transition-opacity duration-700 ease-out", on ? "opacity-100" : "opacity-0")}>
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse 70% 60% at ${SPOTS[id].glow}, ${main}38, ${second}14 45%, transparent 75%)` }}
            />
            <Icon name={art.icon} className={cx("absolute h-72 w-72 opacity-[0.05] sm:h-96 sm:w-96", SPOTS[id].mark)} style={{ color: main }} />
            {on &&
              Array.from({ length: PARTICLES }, (_, i) => (
                <span
                  key={i}
                  className={`ambiance-particle ambiance-${art.particles}`}
                  style={{
                    left: `${noise(i, layer) * 100}%`,
                    animationDelay: `${-noise(i, layer + 7) * 14}s`,
                    animationDuration: `${10 + noise(i, layer + 3) * 8}s`,
                    ["--particle-color" as string]: i % 3 === 0 ? second : main,
                    ["--particle-size" as string]: `${3 + noise(i, layer + 11) * 4}px`,
                  }}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
});
