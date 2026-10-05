import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/core/game";
import { geometryOf } from "@/features/map/geometry";
import { MapBadge } from "@/features/map/markers";
import { FEATURE_COLORS, FEATURE_ICONS, playerColor } from "@/features/map/palette";
import { useGame } from "../useGame";
import { entryId, useLogStream } from "./useLogStream";

type Kind = "conquest" | "attack" | "tribe" | "fortress" | "abandon";

interface Effect {
  id: string;
  kind: Kind;
  region: number;
  color: string;
  /** Tokens the defender lost (attacks). */
  lost: number;
}

const KINDS: Record<string, Kind> = {
  conquered: "conquest",
  conqueredFrom: "attack",
  conqueredTribe: "tribe",
  fortress: "fortress",
  abandoned: "abandon",
};

/** Longest animation below, after which an effect is removed. */
const EFFECT_MS = 1600;
const NEUTRAL = "#8A8580";

/**
 * Short animations drawn on the map, in map units, when the log reports something that
 * happened on a region: a coloured flash and ripple for a conquest, crossed swords and the
 * defender's losses for an attack, the tribe leaving, a fortress rising…
 */
export function BoardEffects() {
  const { game, topology } = useGame();
  const geometry = geometryOf(game.map, topology);
  const [effects, setEffects] = useState<Effect[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useLogStream(game.log, (entries: LogEntry[]) => {
    const fresh: Effect[] = [];
    entries.forEach((entry, i) => {
      const kind = KINDS[entry.key];
      const region = Number(entry.params?.region);
      if (!kind || !Number.isInteger(region) || !game.regions[region]) return;
      const owner = game.players.find((p) => p.id === game.regions[region].owner);
      fresh.push({ id: entryId(entry, i), kind, region, color: owner ? playerColor(owner.color) : NEUTRAL, lost: Number(entry.params?.lost ?? 0) });
    });
    if (!fresh.length) return;
    const ids = new Set(fresh.map((e) => e.id));
    setEffects((list) => [...list.filter((e) => !ids.has(e.id)), ...fresh].slice(-12));
    timers.current.push(window.setTimeout(() => setEffects((list) => list.filter((e) => !ids.has(e.id))), EFFECT_MS));
  });

  return (
    <>
      {effects.map(({ id, kind, region, color, lost }) => {
        const { x, y } = topology.anchor[region];
        return (
          <g key={id}>
            {kind !== "fortress" && <path d={geometry.fills[region]} fill={kind === "abandon" ? NEUTRAL : color} className="fx-flash" />}
            <circle cx={x} cy={y} r={0.55} fill="none" stroke={kind === "attack" ? "#FFFFFF" : color} strokeWidth={0.12} className="fx-ripple" />
            {kind === "attack" && (
              <>
                <g className="fx-pop-out">
                  <MapBadge icon="swords" color="#B42318" x={x} y={y} r={0.46} />
                </g>
                {lost > 0 && (
                  <text x={x + 0.55} y={y - 0.45} fontSize={0.62} fontWeight={800} textAnchor="middle" fill="#E5484D" stroke="#FFFFFF" strokeWidth={0.1} paintOrder="stroke" className="fx-rise" style={{ fontFamily: "var(--font-sans)" }}>
                    −{lost}
                  </text>
                )}
              </>
            )}
            {kind === "tribe" && (
              <g className="fx-rise">
                <MapBadge icon={FEATURE_ICONS.lostTribe} color={FEATURE_COLORS.lostTribe} x={x} y={y - 0.2} r={0.36} />
              </g>
            )}
            {kind === "fortress" && (
              <g className="fx-pop-in">
                <MapBadge icon="fortress" color="#4B5563" x={x} y={y - 0.1} r={0.5} />
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}
