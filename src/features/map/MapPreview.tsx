import { useMemo } from "react";
import { topologyOf } from "@/core/map/cache";
import { buildTopology } from "@/core/map/topology";
import type { GameMap } from "@/core/map/types";
import { HexMap } from "./HexMap";
import { FEATURE_ICONS } from "./palette";

/** Read-only map thumbnail with feature icons. */
export function MapPreview({ map, className, live }: { map: GameMap; className?: string; live?: boolean }) {
  // `live` maps (being edited) change without a new `updatedAt`, so they skip the cache.
  const topology = useMemo(() => (live ? buildTopology(map) : topologyOf(map)), [map, live]);
  return (
    <HexMap
      map={map}
      topology={topology}
      className={className}
      renderOverlay={(region, { x, y }) => {
        const features = map.regions[region].features;
        if (!features.length) return null;
        return (
          <text x={x} y={y + 0.18} fontSize={0.62} textAnchor="middle">
            {features.map((f) => FEATURE_ICONS[f]).join("")}
          </text>
        );
      }}
    />
  );
}
