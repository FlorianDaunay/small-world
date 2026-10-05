import type { EventId, ExtensionId } from "@/core/game";
import type { MapAtmosphere } from "@/features/map/palette";
import type { IconName } from "@/ui/icons/Icon";

/** Floating particles of an extension's ambiance. */
export type Particles = "snow" | "embers" | "motes" | "sparks" | "leaves";

export interface ExtensionArt {
  icon: IconName;
  /** Main and secondary colours: card gradient and ambiance glow. */
  colors: readonly [string, string];
  particles: Particles;
  /** How the map looks when the extension is in play. */
  atmosphere?: MapAtmosphere;
}

/**
 * Illustration of each extension. Like race and power art, these colours are independent of
 * the UI theme: they tint the ambiance layer drawn behind the screens, never the UI itself.
 */
export const EXTENSION_ART: Record<ExtensionId, ExtensionArt> = {
  cursed: { icon: "extCursed", colors: ["#6B3FA0", "#3F8A4A"], particles: "motes" },
  wilds: { icon: "extWilds", colors: ["#1F8A5B", "#C9952B"], particles: "leaves" },
  legends: { icon: "extLegends", colors: ["#B8862A", "#3A5BA8"], particles: "sparks" },
  winter: { icon: "extWinter", colors: ["#4A97D6", "#9FD3F0"], particles: "snow", atmosphere: "winter" },
  drought: { icon: "extDrought", colors: ["#D9822B", "#B5452B"], particles: "embers", atmosphere: "drought" },
};

export const EVENT_ART: Record<EventId, { icon: IconName; color: string }> = {
  harvest: { icon: "harvest", color: "#B98A16" },
  goldRush: { icon: "goldRush", color: "#A87C0A" },
  arcane: { icon: "arcane", color: "#6A3FB5" },
  fog: { icon: "fog", color: "#5F6B7A" },
  truce: { icon: "truce", color: "#2F7D8C" },
  migration: { icon: "migration", color: "#8A5A2B" },
  plague: { icon: "plague", color: "#5B6B2E" },
  landslide: { icon: "landslide", color: "#7A6A5C" },
};

/** The map look for a set of extensions (seasons are mutually exclusive). */
export function mapAtmosphere(extensions: readonly ExtensionId[]): MapAtmosphere {
  for (const id of extensions) {
    const atmosphere = EXTENSION_ART[id].atmosphere;
    if (atmosphere) return atmosphere;
  }
  return "default";
}
