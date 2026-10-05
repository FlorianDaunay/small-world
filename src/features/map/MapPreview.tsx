import { useMemo } from "react";
import { topologyOf } from "@/core/map/cache";
import { buildTopology } from "@/core/map/topology";
import type { GameMap } from "@/core/map/types";
import { HexMap } from "./HexMap";
import { FeatureBadges } from "./markers";
import type { MapAtmosphere } from "./palette";

/** Read-only map thumbnail with feature icons. */
export function MapPreview({ map, className, live, atmosphere }: { map: GameMap; className?: string; live?: boolean; atmosphere?: MapAtmosphere }) {
  // `live` maps (being edited) change without a new `updatedAt`, so they skip the cache.
  const topology = useMemo(() => (live ? buildTopology(map) : topologyOf(map)), [map, live]);
  return (
    <HexMap
      map={map}
      topology={topology}
      className={className}
      atmosphere={atmosphere}
      renderOverlay={(region, { x, y }) => {
        const features = map.regions[region].features;
        return features.length ? <FeatureBadges features={features} x={x} y={y} r={0.3} /> : null;
      }}
    />
  );
}
