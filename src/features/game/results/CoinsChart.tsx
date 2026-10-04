import { useMemo, useRef, useState } from "react";
import type { PlayerState } from "@/core/game";
import { STARTING_COINS } from "@/core/game";
import { playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";

const W = 640;
const H = 280;
const M = { top: 14, right: 86, bottom: 30, left: 40 };

/** Rounded tick step giving about `count` ticks up to `max`. */
function niceStep(max: number, count = 4) {
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
}

/**
 * Coins of every player after each of their turns. One axis, thin lines, direct end labels
 * plus a legend, a crosshair tooltip on hover, and the data table on demand.
 */
export function CoinsChart({ players }: { players: PlayerState[] }) {
  const t = useT();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const series = useMemo(() => players.map((p) => ({ player: p, values: [STARTING_COINS, ...p.stats.coinsTimeline] })), [players]);
  const turns = Math.max(1, ...series.map((s) => s.values.length - 1));
  const maxValue = Math.max(10, ...series.flatMap((s) => s.values));
  const step = niceStep(maxValue);
  const top = Math.ceil(maxValue / step) * step;
  const x = (i: number) => M.left + (i / turns) * (W - M.left - M.right);
  const y = (v: number) => H - M.bottom - (v / top) * (H - M.top - M.bottom);

  // End labels, pushed apart so they never overlap.
  const labels = useMemo(() => {
    const items = series.map((s) => ({ id: s.player.id, name: s.player.name, color: playerColor(s.player.color), y: y(s.values[s.values.length - 1]), x: x(s.values.length - 1) }));
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) items[i].y = Math.max(items[i].y, items[i - 1].y + 14);
    return items;
    // x/y only depend on values derived from the series.
  }, [series]);

  const onMove = (e: React.PointerEvent) => {
    const rect = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / (W - M.left - M.right)) * turns);
    setHover(i >= 0 && i <= turns ? i : null);
  };

  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const hovered = hover == null ? [] : series.filter((s) => s.values[hover] !== undefined).sort((a, b) => b.values[hover]! - a.values[hover]!);

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label={t("results.legend")}>
        {series.map((s) => (
          <li key={s.player.id} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-pill" style={{ background: playerColor(s.player.color), height: 3 }} />
            {s.player.name}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={t("results.chartTitle")}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="rgb(var(--color-border))" strokeWidth={1} />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--color-text-muted))">
                {v}
              </text>
            </g>
          ))}
          {Array.from({ length: turns + 1 }, (_, i) => i)
            .filter((i) => turns <= 12 || i % 2 === 0)
            .map((i) => (
              <text key={i} x={x(i)} y={H - M.bottom + 18} textAnchor="middle" fontSize={11} fill="rgb(var(--color-text-muted))">
                {i}
              </text>
            ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={H - M.bottom} stroke="rgb(var(--color-text-muted))" strokeWidth={1} strokeDasharray="3 3" />}
          {series.map((s) => (
            <polyline
              key={s.player.id}
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={playerColor(s.player.color)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover != null &&
            series.map((s) =>
              s.values[hover] !== undefined ? (
                <circle key={s.player.id} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={playerColor(s.player.color)} stroke="rgb(var(--color-surface))" strokeWidth={2} />
              ) : null
            )}
          {labels.map((l) => (
            <g key={l.id}>
              <circle cx={l.x} cy={y(series.find((s) => s.player.id === l.id)!.values.at(-1)!)} r={3.5} fill={l.color} stroke="rgb(var(--color-surface))" strokeWidth={2} />
              <text x={W - M.right + 8} y={l.y + 4} fontSize={11} fontWeight={600} fill="rgb(var(--color-text-secondary))">
                {l.name.length > 11 ? `${l.name.slice(0, 10)}…` : l.name}
              </text>
            </g>
          ))}
          <text x={(M.left + W - M.right) / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="rgb(var(--color-text-muted))">
            {t("results.axisTurn")}
          </text>
        </svg>
        {hover != null && hovered.length > 0 && (
          <div
            className="card pointer-events-none absolute top-2 z-10 min-w-[9rem] p-2 text-xs shadow-overlay"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > turns / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          >
            <p className="mb-1 font-semibold">{hover === 0 ? t("results.start") : t("results.afterTurn", { turn: hover })}</p>
            {hovered.map((s) => (
              <p key={s.player.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-pill" style={{ background: playerColor(s.player.color) }} />
                <span className="flex-1 text-text-secondary">{s.player.name}</span>
                <span className="font-mono font-semibold tabular-nums">{s.values[hover]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
        {showTable ? t("results.hideTable") : t("results.showTable")}
      </button>
      {showTable && (
        <div className="scrollbar-thin mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="px-2 py-1 text-left font-medium">{t("results.axisTurn")}</th>
                {series.map((s) => (
                  <th key={s.player.id} className="px-2 py-1 text-right font-medium">
                    {s.player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {Array.from({ length: turns + 1 }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1">{i}</td>
                  {series.map((s) => (
                    <td key={s.player.id} className="px-2 py-1 text-right">
                      {s.values[i] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
