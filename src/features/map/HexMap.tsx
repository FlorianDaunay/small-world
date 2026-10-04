import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cellCenter, gridSize, hexPoints } from "@/core/map/hex";
import type { MapTopology } from "@/core/map/topology";
import type { GameMap } from "@/core/map/types";
import { cx } from "@/ui/cx";
import { buildGeometry } from "./geometry";
import { cellColor } from "./palette";

export interface HexMapProps {
  map: GameMap;
  topology: MapTopology;
  /** Regions outlined as "you can act here". */
  highlight?: ReadonlySet<number>;
  selected?: number | null;
  hovered?: number | null;
  /** Drawn on top of each region, at its anchor point. */
  renderOverlay?: (region: number, anchor: { x: number; y: number }) => ReactNode;
  /** Dims regions (e.g. not reachable) without hiding them. */
  dimmed?: ReadonlySet<number>;
  showEmptyCells?: boolean;
  /** Pan with drag and zoom with the wheel (disabled in the editor, where drag paints). */
  panZoom?: boolean;
  onRegionClick?: (region: number) => void;
  onRegionContextMenu?: (region: number) => void;
  onRegionHover?: (region: number | null) => void;
  /** Cell-level pointer events, for the editor's brushes. `dragging` is true while the button is held. */
  onCellPointer?: (cell: number, dragging: boolean) => void;
  className?: string;
  children?: ReactNode;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PADDING = 0.6;

/** Interactive SVG rendering of a hexagon map, shared by the game board and the map editor. */
export const HexMap = memo(function HexMap({
  map,
  topology,
  highlight,
  selected,
  hovered,
  renderOverlay,
  dimmed,
  showEmptyCells,
  panZoom,
  onRegionClick,
  onRegionContextMenu,
  onRegionHover,
  onCellPointer,
  className,
  children,
}: HexMapProps) {
  const geometry = useMemo(() => buildGeometry(map, topology), [map, topology]);
  const full = useMemo<ViewBox>(() => {
    const { width, height } = gridSize(map.cols, map.rows);
    return { x: -PADDING, y: -PADDING, w: width + PADDING * 2, h: height + PADDING * 2 };
  }, [map.cols, map.rows]);
  const [view, setView] = useState<ViewBox>(full);
  useEffect(() => setView(full), [full]);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: ViewBox; moved: boolean } | null>(null);
  const painting = useRef(false);

  const zoom = useCallback(
    (factor: number, origin?: { x: number; y: number }) => {
      setView((v) => {
        const w = Math.min(full.w * 1.5, Math.max(full.w / 5, v.w * factor));
        const h = (w / v.w) * v.h;
        const ox = origin?.x ?? v.x + v.w / 2;
        const oy = origin?.y ?? v.y + v.h / 2;
        return { x: ox - ((ox - v.x) * w) / v.w, y: oy - ((oy - v.y) * h) / v.h, w, h };
      });
    },
    [full]
  );

  /** Converts a screen point into map units (accounts for preserveAspectRatio letterboxing). */
  const toMap = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const p = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !panZoom) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, toMap(e.clientX, e.clientY));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [panZoom, zoom]);

  useEffect(() => {
    const stop = () => (painting.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!panZoom || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = Math.max(d.view.w / rect.width, d.view.h / rect.height);
    setView({ ...d.view, x: d.view.x - dx * scale, y: d.view.y - dy * scale });
  };
  const wasDrag = () => {
    const moved = drag.current?.moved ?? false;
    drag.current = null;
    return moved;
  };

  const cells = useMemo(
    () =>
      map.cells.map((region, cell) => {
        if (region < 0 && !showEmptyCells) return null;
        const { x, y } = cellCenter(cell, map.cols);
        const terrain = region >= 0 ? map.regions[region]?.terrain : undefined;
        return { cell, region, points: hexPoints(x, y, 1.002), fill: terrain ? cellColor(terrain, cell) : undefined };
      }),
    [map, showEmptyCells]
  );

  return (
    <div className={cx("relative h-full w-full select-none overflow-hidden", className)}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={cx("h-full w-full touch-none", panZoom && "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => onRegionHover?.(null)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g>
          {cells.map((c) =>
            c ? (
              <polygon
                key={c.cell}
                points={c.points}
                fill={c.fill ?? "transparent"}
                className={cx(
                  c.region < 0 && "fill-surface-hover/40 stroke-border",
                  c.region >= 0 && dimmed?.has(c.region) && "opacity-55",
                  (onRegionClick || onCellPointer) && "cursor-pointer"
                )}
                strokeWidth={c.region < 0 ? 0.03 : 0}
                onPointerDown={(e) => {
                  if (!onCellPointer || e.button !== 0) return;
                  painting.current = true;
                  (e.target as Element).releasePointerCapture?.(e.pointerId);
                  onCellPointer(c.cell, false);
                }}
                onPointerEnter={() => {
                  if (onCellPointer && painting.current) onCellPointer(c.cell, true);
                  onRegionHover?.(c.region >= 0 ? c.region : null);
                }}
                onClick={() => {
                  if (wasDrag() || c.region < 0) return;
                  onRegionClick?.(c.region);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (c.region >= 0) onRegionContextMenu?.(c.region);
                }}
              />
            ) : null
          )}
        </g>
        <path d={geometry.borders} fill="none" stroke="#1d1a16" strokeOpacity={0.8} strokeWidth={0.11} strokeLinecap="round" pointerEvents="none" />
        {highlight && (
          <g pointerEvents="none">
            {[...highlight].map((r) => (
              <path key={r} d={geometry.outlines[r]} fill="none" stroke="#FFFFFF" strokeWidth={0.12} strokeLinecap="round" className="animate-pulse-ring" />
            ))}
          </g>
        )}
        {hovered != null && hovered >= 0 && geometry.outlines[hovered] && (
          <path d={geometry.outlines[hovered]} fill="#FFFFFF" fillOpacity={0.08} stroke="#FFFFFF" strokeWidth={0.1} strokeLinecap="round" pointerEvents="none" />
        )}
        {selected != null && selected >= 0 && geometry.outlines[selected] && (
          <path d={geometry.outlines[selected]} fill="none" stroke="rgb(var(--color-accent))" strokeWidth={0.16} strokeLinecap="round" pointerEvents="none" />
        )}
        {renderOverlay && (
          <g pointerEvents="none">
            {topology.anchor.map((anchor, region) => (topology.cellsOf[region].length ? <g key={region}>{renderOverlay(region, anchor)}</g> : null))}
          </g>
        )}
      </svg>
      {panZoom && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button type="button" className="btn btn-icon h-8 w-8 shadow-overlay" onClick={() => zoom(1 / 1.25)} aria-label="zoom in">
            +
          </button>
          <button type="button" className="btn btn-icon h-8 w-8 shadow-overlay" onClick={() => zoom(1.25)} aria-label="zoom out">
            −
          </button>
          <button type="button" className="btn btn-icon h-8 w-8 shadow-overlay" onClick={() => setView(full)} aria-label="reset">
            ⤢
          </button>
        </div>
      )}
      {children}
    </div>
  );
});
