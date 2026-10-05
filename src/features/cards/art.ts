import type { PowerId, RaceId } from "@/core/game";
import type { IconName } from "@/ui/icons/Icon";

/**
 * Card art: an icon and a signature color per race and power. Like the map palette, these are
 * illustration colors, independent of the UI theme (white icons on them stay readable).
 */
export const RACE_ART: Record<RaceId, { icon: IconName; color: string }> = {
  humans: { icon: "humans", color: "#B7871A" },
  elves: { icon: "elves", color: "#1F8A5B" },
  dwarves: { icon: "dwarves", color: "#8A5133" },
  orcs: { icon: "orcs", color: "#55802A" },
  giants: { icon: "giants", color: "#6F655C" },
  wizards: { icon: "wizards", color: "#6644B8" },
  ratmen: { icon: "ratmen", color: "#7D6B5E" },
  tritons: { icon: "tritons", color: "#137FA3" },
  trolls: { icon: "trolls", color: "#3F7462" },
  skeletons: { icon: "skeletons", color: "#5F5B73" },
  halflings: { icon: "halflings", color: "#B86A1E" },
  amazons: { icon: "amazons", color: "#B02D55" },
  goblins: { icon: "goblins", color: "#4F7A1F" },
  kobolds: { icon: "kobolds", color: "#9A4A2A" },
  dryads: { icon: "dryads", color: "#2F7D4A" },
  leprechauns: { icon: "leprechauns", color: "#3E8E3A" },
};

export const POWER_ART: Record<PowerId, { icon: IconName; color: string }> = {
  alchemist: { icon: "alchemist", color: "#7E3FA0" },
  merchant: { icon: "merchant", color: "#A8820F" },
  fortified: { icon: "fortified", color: "#5B6670" },
  forest: { icon: "forest", color: "#2D6E31" },
  hill: { icon: "hill", color: "#5E8A2E" },
  swamp: { icon: "swamp", color: "#4E6B4B" },
  mounted: { icon: "mounted", color: "#7A5A4C" },
  commando: { icon: "commando", color: "#B02A2A" },
  seafaring: { icon: "seafaring", color: "#1659A8" },
  flying: { icon: "flying", color: "#0A7AAE" },
  wealthy: { icon: "wealthy", color: "#A87C0A" },
  pillaging: { icon: "pillaging", color: "#C24A0A" },
  underworld: { icon: "underworld", color: "#4E3A33" },
  stout: { icon: "stout", color: "#4A5D68" },
  peaceful: { icon: "peaceful", color: "#0E7C70" },
  hordes: { icon: "hordes", color: "#7A3B2E" },
  marauding: { icon: "marauding", color: "#5B4A6E" },
  imperial: { icon: "imperial", color: "#9C7A12" },
  entrenched: { icon: "entrenched", color: "#6A5A44" },
};
