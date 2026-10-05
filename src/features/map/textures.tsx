import type { ReactNode } from "react";
import type { Texture } from "./palette";

const DARK = "#1D1A16";
const LIGHT = "#FFFFFF";

interface PatternDef {
  width: number;
  height: number;
  /** Rotation of the motif, in degrees. */
  angle?: number;
  body: ReactNode;
}

const line = (d: string, color: string, opacity: number, width = 0.045): ReactNode => (
  <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
);

/**
 * Light, low-contrast motifs laid over each terrain colour (in map units, so they scale with
 * the zoom). They give the hexagons some texture without competing with tokens and markers.
 */
const PATTERNS: Record<Texture, PatternDef> = {
  furrows: { width: 0.4, height: 0.4, angle: -30, body: line("M-0.1 0.2H0.5", DARK, 0.13, 0.05) },
  hills: { width: 1.1, height: 0.8, body: line("M0.08 0.36q0.2-0.24 0.4 0M0.63 0.74q0.2-0.24 0.4 0", DARK, 0.2) },
  trees: {
    width: 0.9,
    height: 0.8,
    body: (
      <g fill="#123D1A" fillOpacity={0.3}>
        <path d="M0.22 0.08L0.36 0.34H0.08Z" />
        <path d="M0.67 0.48L0.81 0.74H0.53Z" />
      </g>
    ),
  },
  reeds: { width: 0.8, height: 0.6, body: line("M0.08 0.42h0.24M0.48 0.16h0.2M0.6 0.55v-0.18M0.66 0.55v-0.12", "#22372A", 0.26, 0.04) },
  peaks: { width: 1, height: 0.84, body: line("M0.06 0.55L0.24 0.22L0.42 0.55M0.56 0.8L0.72 0.5L0.88 0.8", DARK, 0.24, 0.05) },
  snowPeaks: {
    width: 1,
    height: 0.84,
    body: (
      <>
        <path d="M0.15 0.38L0.24 0.22L0.33 0.38L0.24 0.34Z M0.64 0.64L0.72 0.5L0.8 0.64L0.72 0.6Z" fill={LIGHT} fillOpacity={0.85} />
        {line("M0.06 0.55L0.24 0.22L0.42 0.55M0.56 0.8L0.72 0.5L0.88 0.8", DARK, 0.22, 0.05)}
      </>
    ),
  },
  waves: { width: 0.9, height: 0.5, body: line("M0 0.25q0.225-0.13 0.45 0t0.45 0", LIGHT, 0.26, 0.04) },
  ripples: { width: 0.75, height: 0.5, body: line("M0.08 0.18q0.13-0.08 0.26 0M0.45 0.4q0.13-0.08 0.26 0", LIGHT, 0.4, 0.035) },
  ice: {
    width: 1,
    height: 1,
    body: (
      <>
        {line("M0.1 0.2L0.4 0.45L0.34 0.82M0.4 0.45L0.85 0.55L0.95 0.9", LIGHT, 0.85, 0.035)}
        {line("M0.6 0.1L0.7 0.28", "#6A9BB8", 0.35, 0.03)}
      </>
    ),
  },
  cracks: { width: 0.8, height: 0.8, body: line("M0 0.3L0.3 0.36L0.45 0.08M0.3 0.36L0.4 0.7L0.8 0.64M0.4 0.7L0.34 0.8", "#5A4630", 0.4, 0.035) },
};

export const TEXTURES = Object.keys(PATTERNS) as Texture[];

export const textureId = (prefix: string, texture: Texture) => `${prefix}-${texture}`;

/** `<pattern>` definitions for every texture, ids prefixed so several maps can share a page. */
export function TextureDefs({ prefix, textures }: { prefix: string; textures: Iterable<Texture> }) {
  return (
    <defs>
      {[...new Set(textures)].map((texture) => {
        const p = PATTERNS[texture];
        return (
          <pattern
            key={texture}
            id={textureId(prefix, texture)}
            width={p.width}
            height={p.height}
            patternUnits="userSpaceOnUse"
            patternTransform={p.angle ? `rotate(${p.angle})` : undefined}
          >
            {p.body}
          </pattern>
        );
      })}
    </defs>
  );
}
