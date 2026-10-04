import { useCallback, useMemo, useState } from "react";
import { RACES, conquestBlock, conquestCost, regionDefence, type GameState } from "@/core/game";
import { HexMap } from "@/features/map/HexMap";
import { FEATURE_ICONS, TERRAIN_ICONS, playerColor } from "@/features/map/palette";
import { useT } from "@/i18n";
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
    (region: number) => {
      if (!myTurn) return onSelect(region);
      if (phase === "conquer") {
        const cost = targets.get(region);
        if (cost !== undefined && self?.active && self.active.hand >= cost) {
          dispatch({ type: "conquer", region });
          onSelect(null);
          return;
        }
      }
      if (phase === "redeploy" && myRegions.has(region)) dispatch({ type: "deploy", region, delta: 1 });
      onSelect(region);
    },
    [myTurn, phase, targets, self, myRegions, dispatch, onSelect]
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
      {hovered != null && <RegionTooltip region={hovered} />}
    </HexMap>
  );
}

function RegionMarkers({ game, region, x, y, color }: { game: GameState; region: number; x: number; y: number; color?: string }) {
  const state = game.regions[region];
  const def = game.map.regions[region];
  const features = def.features.filter((f) => f !== "lostTribe");
  const markers = [state.fortress && "🏰", state.lair && "🪨", state.hole && "🍄"].filter(Boolean).join("");
  const owner = state.owner ? game.players.find((p) => p.id === state.owner) : undefined;
  const race = owner && (state.declined ? owner.declined?.race : owner.active?.race);

  return (
    <g>
      {features.length > 0 && (
        <text x={x} y={y - 0.62} fontSize={0.48} textAnchor="middle">
          {features.map((f) => FEATURE_ICONS[f]).join("")}
        </text>
      )}
      {state.lostTribe && (
        <text x={x} y={y + 0.22} fontSize={0.7} textAnchor="middle">
          {FEATURE_ICONS.lostTribe}
        </text>
      )}
      {state.tokens > 0 && color && (
        <g>
          <circle
            cx={x}
            cy={y}
            r={0.5}
            fill={state.declined ? "#6B6B6B" : color}
            stroke={state.declined ? color : "#FFFFFF"}
            strokeWidth={state.declined ? 0.14 : 0.07}
            strokeDasharray={state.declined ? "0.18 0.1" : undefined}
          />
          {race && (
            <text x={x - 0.55} y={y - 0.25} fontSize={0.42} textAnchor="middle">
              {RACES[race].icon}
            </text>
          )}
          <text x={x} y={y + 0.18} fontSize={0.5} fontWeight={700} textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-sans)" }}>
            {state.tokens}
          </text>
        </g>
      )}
      {markers && (
        <text x={x + 0.62} y={y + 0.5} fontSize={0.42} textAnchor="middle">
          {markers}
        </text>
      )}
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
    <div className="card pointer-events-none absolute left-3 top-3 max-w-[16rem] space-y-1 p-3 text-xs shadow-overlay">
      <p className="text-sm font-semibold">
        {TERRAIN_ICONS[def.terrain]} {t.dyn(`terrain.${def.terrain}`)}
      </p>
      {def.features.length > 0 && <p className="text-text-secondary">{def.features.map((f) => `${FEATURE_ICONS[f]} ${t.dyn(`feature.${f}`)}`).join(" · ")}</p>}
      <p className="text-text-secondary">
        {owner ? t(state.declined ? "game.region.ownerDeclined" : "game.region.owner", { player: owner.name }) : t("game.region.empty")}
        {state.tokens > 0 && ` · ${t("game.region.tokens", { count: state.tokens })}`}
      </p>
      <p className="text-text-secondary">
        {t("game.region.defence")} : {regionDefence(game, region)}
      </p>
      {showCost && <p className="font-semibold text-accent">{t("game.region.cost", { count: conquestCost(game, topology, region) })}</p>}
      {block && block !== "alreadyYours" && <p className="text-danger">{t("game.region.blocked", { reason: t.dyn(`game.blocks.${block}`) })}</p>}
    </div>
  );
}
