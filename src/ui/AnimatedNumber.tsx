import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";

const DURATION = 700;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A number that counts up (or down) to its new value, with a floating "+N" when it grows.
 * The first value is shown as is: only later changes are animated.
 */
export function AnimatedNumber({ value, className, gainClassName }: { value: number; className?: string; gainClassName?: string }) {
  const [shown, setShown] = useState(value);
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    if (value > from) setGain({ id: Date.now(), amount: value - from });
    if (reducedMotion()) return setShown(value);
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / DURATION);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="relative inline-flex">
      <span className={cx(className, gain && "fx-glow")} key={gain?.id}>
        {shown}
      </span>
      {gain && (
        <span
          key={`gain-${gain.id}`}
          className={cx("fx-float-up pointer-events-none absolute -top-1 left-1/2 whitespace-nowrap font-mono text-xs font-bold", gainClassName)}
          onAnimationEnd={() => setGain(null)}
          aria-hidden
        >
          +{gain.amount}
        </span>
      )}
    </span>
  );
}
