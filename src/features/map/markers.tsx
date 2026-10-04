import type { Feature } from "@/core/map/types";
import { SvgIcon, type IconName } from "@/ui/icons/Icon";
import { FEATURE_COLORS, FEATURE_ICONS } from "./palette";

/** A white icon on a round coloured badge, in map units. */
export function MapBadge({ icon, color, x, y, r = 0.3 }: { icon: IconName; color: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke="#FFFFFF" strokeWidth={0.05} />
      <SvgIcon name={icon} x={x} y={y} size={r * 1.35} color="#FFFFFF" />
    </g>
  );
}

/** A row of feature badges centred on (x, y). */
export function FeatureBadges({ features, x, y, r = 0.27 }: { features: Feature[]; x: number; y: number; r?: number }) {
  const step = r * 2.15;
  const start = x - ((features.length - 1) * step) / 2;
  return (
    <g>
      {features.map((f, i) => (
        <MapBadge key={f} icon={FEATURE_ICONS[f]} color={FEATURE_COLORS[f]} x={start + i * step} y={y} r={r} />
      ))}
    </g>
  );
}
