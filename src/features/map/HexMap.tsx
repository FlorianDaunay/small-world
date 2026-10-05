import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cellCenter, gridSize, hexPoints } from "@/core/map/hex";
import type { MapTopology } from "@/core/map/topology";
import type { GameMap } from "@/core/map/types";
import { cx } from "@/ui/cx";
import { geometryOf } from "./geometry";
import { regionColor, terrainLook, type MapAtmosphere, type Texture } from "./palette";
import { TextureDefs, textureId } from "./textures";

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
  /** Seasonal look of the terrains (extensions). */
  atmosphere?: MapAtmosphere;
  /** Extra SVG drawn above everything, in map units (animations). */
  layers?: ReactNode;
  showEmptyCells?: boolean;
  /** Pan with drag and zoom with the wheel (disabled in the editor, where drag paints). */
  panZoom?: boolean;
  /** `pointerType` is "touch", "pen" or "mouse": touch screens may want a confirmation tap. */
  onRegionClick?: (region: number, pointerType: string) => void;
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
  atmosphere = "default",
  layers,
  showEmptyCells,
  panZoom,
  onRegionClick,
  onRegionContextMenu,
  onRegionHover,
  onCellPointer,
  className,
  children,
}: HexMapProps) {
  const geometry = useMemo(() => geometryOf(map, topology), [map, topology]);
  const texturePrefix = `tx${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const full = useMemo<ViewBox>(() => {
    const { width, height } = gridSize(map.cols, map.rows);
    return { x: -PADDING, y: -PADDING, w: width + PADDING * 2, h: height + PADDING * 2 };
  }, [map.cols, map.rows]);
  const [view, setView] = useState<ViewBox>(full);
  useEffect(() => setView(full), [full]);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: ViewBox; moved: boolean } | null>(null);
  const painting = useRef(false);
  const lastPointerType = useRef("mouse");

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

  // Active touch points, for pinch-to-zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType;
    if (!panZoom || e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
      // A pinch is never a tap: mark the gesture as a drag so no region gets clicked.
      if (drag.current) drag.current.moved = true;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current && pointers.current.size < 2) {
      pinch.current = null;
      // The remaining finger keeps panning from the zoomed view, without triggering a tap.
      const rest = [...pointers.current.values()][0];
      drag.current = rest ? { x: rest.x, y: rest.y, view, moved: true } : { x: 0, y: 0, view, moved: true };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 0) zoom(pinch.current.distance / distance, toMap((a.x + b.x) / 2, (a.y + b.y) / 2));
      pinch.current.distance = distance;
      return;
    }
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

  /** Each region's colour, and the regions sharing each texture merged into a single path. */
  const paint = useMemo(() => {
    const fills = map.regions.map((r, i) => regionColor(r.terrain, i, atmosphere));
    const textures = new Map<Texture, string>();
    map.regions.forEach((r, i) => {
      const { texture } = terrainLook(r.terrain, atmosphere);
      textures.set(texture, (textures.get(texture) ?? "") + (geometry.fills[i] ?? ""));
    });
    return { fills, textures: [...textures] };
  }, [map.regions, geometry, atmosphere]);

  /** Per-cell shapes: empty cells (editor) and the hit areas of cell-level tools. */
  const cellLevel = !!onCellPointer;
  const cells = useMemo(
    () =>
      showEmptyCells || cellLevel
        ? map.cells.map((region, cell) => {
            if (region < 0 && !showEmptyCells) return null;
            const { x, y } = cellCenter(cell, map.cols);
            return { cell, region, points: hexPoints(x, y, 1.002) };
          })
        : [],
    [map, showEmptyCells, cellLevel]
  );

  const regionClick = (region: number) => {
    if (wasDrag() || region < 0) return;
    onRegionClick?.(region, lastPointerType.current);
  };
  const interactive = !!(onRegionClick || onCellPointer);
  const silhouette = useMemo(() => geometry.fills.join(""), [geometry]);

  return (
    <div className={cx("relative h-full w-full select-none overflow-hidden", className)}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={cx("h-full w-full touch-none", panZoom && "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => {
          onPointerUp(e);
          onRegionHover?.(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <TextureDefs prefix={texturePrefix} textures={paint.textures.map(([texture]) => texture)} />
        {/* Soft drop shadow: the map floats a little above the background. */}
        <path d={silhouette} fill="#000000" fillOpacity={0.16} transform="translate(0.12 0.2)" pointerEvents="none" />
        {showEmptyCells && (
          <g pointerEvents="none">
            {cells.map((c) => c && c.region < 0 && <polygon key={c.cell} points={c.points} className="fill-surface-hover/40 stroke-border" strokeWidth={0.03} />)}
          </g>
        )}
        <g>
          {geometry.fills.map((d, region) =>
            d ? (
              <path
                key={region}
                d={d}
                fill={paint.fills[region]}
                className={cx(interactive && !onCellPointer && "cursor-pointer")}
                onPointerEnter={() => onRegionHover?.(region)}
                onClick={() => regionClick(region)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onRegionContextMenu?.(region);
                }}
              />
            ) : null
          )}
        </g>
        <g pointerEvents="none">
          {paint.textures.map(([texture, d]) => (
            <path key={texture} d={d} fill={`url(#${textureId(texturePrefix, texture)})`} />
          ))}
          <path d={geometry.grid} fill="none" stroke="#FFFFFF" strokeOpacity={0.13} strokeWidth={0.025} />
          {/* A wide, faint stroke along every border reads as a gentle bevel on both sides. */}
          <path d={geometry.borders + geometry.outline} fill="none" stroke="#000000" strokeOpacity={0.07} strokeWidth={0.34} strokeLinecap="round" />
          <path d={geometry.coast} fill="none" stroke="#FFF6D8" strokeOpacity={0.6} strokeWidth={0.14} strokeLinecap="round" />
          <path d={geometry.borders} fill="none" stroke="#2A241D" strokeOpacity={0.5} strokeWidth={0.065} strokeLinecap="round" />
          <path d={geometry.outline} fill="none" stroke="#2A241D" strokeOpacity={0.7} strokeWidth={0.1} strokeLinecap="round" />
          {dimmed &&
            [...dimmed].map((r) => (geometry.fills[r] ? <path key={r} d={geometry.fills[r]} fill="#000000" fillOpacity={0.3} /> : null))}
        </g>
        {onCellPointer && (
          <g>
            {cells.map((c) =>
              c ? (
                <polygon
                  key={c.cell}
                  points={c.points}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    painting.current = true;
                    (e.target as Element).releasePointerCapture?.(e.pointerId);
                    onCellPointer(c.cell, false);
                  }}
                  onPointerEnter={() => {
                    if (painting.current) onCellPointer(c.cell, true);
                    onRegionHover?.(c.region >= 0 ? c.region : null);
                  }}
                  onClick={() => regionClick(c.region)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (c.region >= 0) onRegionContextMenu?.(c.region);
                  }}
                />
              ) : null
            )}
          </g>
        )}
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
        {layers && <g pointerEvents="none">{layers}</g>}
      </svg>
      {panZoom && (
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 sm:bottom-3 sm:right-3">
          <button type="button" className="btn btn-icon hidden h-8 w-8 shadow-overlay sm:inline-flex" onClick={() => zoom(1 / 1.25)} aria-label="zoom in">
            +
          </button>
          <button type="button" className="btn btn-icon hidden h-8 w-8 shadow-overlay sm:inline-flex" onClick={() => zoom(1.25)} aria-label="zoom out">
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
