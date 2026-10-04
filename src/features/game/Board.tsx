import { useCallback, useMemo, useState } from "react";
import { conquestBlock, conquestCost, regionDefence, type GameState } from "@/core/game";
import { RACE_ART } from "@/features/cards/art";
import { HexMap } from "@/features/map/HexMap";
import { FeatureBadges, MapBadge } from "@/features/map/markers";
import { FEATURE_ICONS, TERRAIN_ICONS, playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
import { Icon, SvgIcon } from "@/ui/icons/Icon";
import { MapLegend } from "./MapLegend";
import { useGame } from "./useGame";

interface BoardProps {
  selected: number | null;
  onSelect: (region: number | null) => void;
}

/** The game map: tokens, markers, reachable regions and click handling per phase. */
export function Board({ selected, onSelect }: BoardProps) {
  const { game, topology, myTurn, targets, myRegions, dispatch, self } = useGame();
  const [hovered, setHovered] = useState<number | null>(null);
  const phase = game.turn.phase;

  const highlight = useMemo(() => {
    if (!myTurn) return undefined;
    if (phase === "conquer") return new Set(targets.keys());
    if (phase === "redeploy") return myRegions;
    return undefined;
  }, [myTurn, phase, targets, myRegions]);

  const onClick = useCallback(
    (region: number, pointerType: string) => {
      // Touch screens have no hover: the first tap shows a region, a second tap acts on it.
      const confirmTap = pointerType !== "touch" || selected === region;
      if (myTurn && phase === "conquer" && confirmTap) {
        const cost = targets.get(region);
        if (cost !== undefined && self?.active && self.active.hand >= cost) {
          dispatch({ type: "conquer", region });
          onSelect(null);
          return;
        }
      }
      if (myTurn && phase === "redeploy" && myRegions.has(region) && confirmTap) dispatch({ type: "deploy", region, delta: 1 });
      onSelect(region);
    },
    [myTurn, phase, targets, self, myRegions, dispatch, onSelect, selected]
  );

  const onContext = useCallback(
    (region: number) => {
      if (myTurn && phase === "redeploy" && myRegions.has(region)) dispatch({ type: "deploy", region, delta: -1 });
    },
    [myTurn, phase, myRegions, dispatch]
  );

  const colorOf = useMemo(() => new Map(game.players.map((p) => [p.id, playerColor(p.color)])), [game.players]);

  const renderOverlay = useCallback(
    (region: number, { x, y }: { x: number; y: number }) => <RegionMarkers game={game} region={region} x={x} y={y} color={colorOf.get(game.regions[region].owner ?? "")} />,
    [game, colorOf]
  );

  const info = hovered ?? selected;

  return (
    <HexMap
      map={game.map}
      topology={topology}
      panZoom
      highlight={highlight}
      selected={selected}
      hovered={hovered}
      onRegionHover={setHovered}
      onRegionClick={onClick}
      onRegionContextMenu={onContext}
      renderOverlay={renderOverlay}
      className="bg-canvas"
    >
      {info != null && <RegionTooltip region={info} />}
      <MapLegend />
    </HexMap>
  );
}

function RegionMarkers({ game, region, x, y, color }: { game: GameState; region: number; x: number; y: number; color?: string }) {
  const state = game.regions[region];
  const def = game.map.regions[region];
  const features = def.features.filter((f) => f !== "lostTribe");
  const owner = state.owner ? game.players.find((p) => p.id === state.owner) : undefined;
  const race = owner && (state.declined ? owner.declined?.race : owner.active?.race);
  const markers = (
    [
      state.fortress && { icon: "fortress", color: "#4B5563" },
      state.lair && { icon: "lair", color: "#3F7462" },
      state.hole && { icon: "hole", color: "#B86A1E" },
    ] as const
  ).filter(Boolean) as { icon: "fortress" | "lair" | "hole"; color: string }[];

  return (
    <g>
      {features.length > 0 && <FeatureBadges features={features} x={x} y={y - 0.72} r={0.24} />}
      {state.lostTribe && <MapBadge icon={FEATURE_ICONS.lostTribe} color="#8A5A2B" x={x} y={y} r={0.38} />}
      {state.tokens > 0 && color && (
        <g>
          <circle
            cx={x}
            cy={y}
            r={0.48}
            fill={state.declined ? "#5B5B5B" : color}
            stroke={state.declined ? color : "#FFFFFF"}
            strokeWidth={state.declined ? 0.13 : 0.07}
            strokeDasharray={state.declined ? "0.17 0.1" : undefined}
          />
          <text x={x} y={y + 0.17} fontSize={0.48} fontWeight={800} textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-sans)" }}>
            {state.tokens}
          </text>
          {race && (
            <g opacity={state.declined ? 0.75 : 1}>
              <circle cx={x - 0.5} cy={y - 0.32} r={0.24} fill={RACE_ART[race].color} stroke="#FFFFFF" strokeWidth={0.04} />
              <SvgIcon name={RACE_ART[race].icon} x={x - 0.5} y={y - 0.32} size={0.34} color="#FFFFFF" />
            </g>
          )}
        </g>
      )}
      {markers.map((m, i) => (
        <MapBadge key={m.icon} icon={m.icon} color={m.color} x={x + 0.52} y={y + 0.36 - i * 0.44} r={0.21} />
      ))}
    </g>
  );
}

function RegionTooltip({ region }: { region: number }) {
  const t = useT();
  const { game, topology, myTurn } = useGame();
  const state = game.regions[region];
  const def = game.map.regions[region];
  const owner = state.owner ? game.players.find((p) => p.id === state.owner) : undefined;
  const block = myTurn && game.turn.phase === "conquer" ? conquestBlock(game, topology, region) : null;
  const showCost = myTurn && game.turn.phase === "conquer" && !block;

  return (
    <div className="card pointer-events-none absolute left-2 top-2 max-w-[15rem] space-y-1 p-2.5 text-xs shadow-overlay sm:left-3 sm:top-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon name={TERRAIN_ICONS[def.terrain]} className="h-4 w-4 text-text-secondary" /> {t.dyn(`terrain.${def.terrain}`)}
      </p>
      {def.features.length > 0 && (
        <p className="flex flex-wrap gap-x-2 text-text-secondary">
          {def.features.map((f) => (
            <span key={f} className="inline-flex items-center gap-1">
              <Icon name={FEATURE_ICONS[f]} /> {t.dyn(`feature.${f}`)}
            </span>
          ))}
        </p>
      )}
      <p className="text-text-secondary">
        {owner ? t(state.declined ? "game.region.ownerDeclined" : "game.region.owner", { player: owner.name }) : t("game.region.empty")}
        {state.tokens > 0 && ` · ${t("game.region.tokens", { count: state.tokens })}`}
      </p>
      <p className="flex items-center gap-1 text-text-secondary">
        <Icon name="shield" /> {t("game.region.defence")} : {regionDefence(game, region)}
      </p>
      {showCost && <p className="font-semibold text-accent">{t("game.region.cost", { count: conquestCost(game, topology, region) })}</p>}
      {block && block !== "alreadyYours" && <p className="text-danger">{t("game.region.blocked", { reason: t.dyn(`game.blocks.${block}`) })}</p>}
    </div>
  );
}
