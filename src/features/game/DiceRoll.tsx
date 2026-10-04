import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/core/game";
import { useT } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { useGame } from "./useGame";

/**
 * The reinforcement die has three blank faces and faces 1, 2, 3. Each face sits on one side
 * of the cube; `turn` is the cube rotation that brings that side to the front.
 */
const FACES = [
  { side: "front", value: 3, turn: { x: 0, y: 0 } },
  { side: "back", value: 0, turn: { x: 0, y: 180 } },
  { side: "right", value: 2, turn: { x: 0, y: -90 } },
  { side: "left", value: 0, turn: { x: 0, y: 90 } },
  { side: "top", value: 1, turn: { x: -90, y: 0 } },
  { side: "bottom", value: 0, turn: { x: 90, y: 0 } },
] as const;

/** Pip positions on a 3x3 grid (0..8) for each value. */
const PIPS: Record<number, number[]> = { 0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6] };

const TUMBLE_MS = 1300;
const SHOW_MS = 3600;

interface Roll {
  id: string;
  player: string;
  value: number;
  success: boolean;
}

const isRoll = (entry: LogEntry) => entry.key === "rollWon" || entry.key === "rollLost";
const rollId = (entry: LogEntry) => `${entry.at}:${entry.params?.player}`;

/**
 * Overlay shown to every player when someone throws the reinforcement die: the die tumbles,
 * lands on the rolled face, then the outcome appears. Rolls already in the log when the game
 * screen opens are not replayed.
 */
export function DiceRoll() {
  const t = useT();
  const { game } = useGame();
  const [roll, setRoll] = useState<Roll | null>(null);
  const [landed, setLanded] = useState(false);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const last = [...game.log].reverse().find(isRoll);
    const id = last ? rollId(last) : "";
    if (seen.current === null) {
      seen.current = id; // first render: remember the latest roll (if any), don't replay it
      return;
    }
    if (!last || id === seen.current) return;
    seen.current = id;
    setLanded(false);
    setRoll({ id, player: String(last.params?.player ?? ""), value: Number(last.params?.value ?? 0), success: last.key === "rollWon" });
  }, [game.log]);

  useEffect(() => {
    if (!roll) return;
    const land = setTimeout(() => setLanded(true), TUMBLE_MS);
    const hide = setTimeout(() => setRoll(null), SHOW_MS);
    return () => {
      clearTimeout(land);
      clearTimeout(hide);
    };
  }, [roll]);

  if (!roll) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/15" role="status" aria-live="polite">
      <div className="card animate-pop flex flex-col items-center gap-4 px-8 py-6 shadow-overlay">
        <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Icon name="dice" className="h-4 w-4" /> {t("dice.rolling", { player: roll.player })}
        </p>
        <Die key={roll.id} value={roll.value} />
        <p
          className={cx(
            "min-h-[1.75rem] text-lg font-bold transition-all duration-300",
            landed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            roll.success ? "text-success" : "text-danger"
          )}
        >
          {t(roll.success ? "dice.success" : "dice.fail", { value: roll.value })}
        </p>
      </div>
    </div>
  );
}

function Die({ value }: { value: number }) {
  // Pick a matching face (blank faces are interchangeable) and add a few full spins on top.
  const [target] = useState(() => {
    const options = FACES.filter((f) => f.value === value);
    const face = options[Math.floor(Math.random() * options.length)] ?? FACES[1];
    return { x: face.turn.x + 360 * 2, y: face.turn.y + 360 * 3 };
  });
  const [transform, setTransform] = useState("rotateX(-25deg) rotateY(35deg)");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTransform(`rotateX(${target.x}deg) rotateY(${target.y}deg)`));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="dice-bounce">
      <div className="dice-scene">
        <div className="dice-cube" style={{ transform, transitionDuration: `${TUMBLE_MS}ms` }}>
          {FACES.map((face) => (
            <div key={face.side} className={`dice-face dice-${face.side}`}>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={cx("dice-pip", PIPS[face.value].includes(i) && "dice-pip-on")} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="dice-shadow" />
    </div>
  );
}
