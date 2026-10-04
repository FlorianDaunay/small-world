import type { LogEntry, PowerId, RaceId } from "@/core/game";
import type { Translator } from "@/i18n";

export const raceName = (t: Translator, race: RaceId) => t.dyn(`race.${race}.name`);
export const powerName = (t: Translator, power: PowerId) => t.dyn(`power.${power}.name`);

/** "Humains Alchimistes" / "Alchemist Humans": word order depends on the language. */
export const comboName = (t: Translator, race: RaceId, power: PowerId) => t("common.combo", { race: raceName(t, race), power: powerName(t, power) });

/** Log lines store ids; names are resolved in the reader's language. */
export function describeLog(t: Translator, entry: LogEntry): string {
  const params = { ...entry.params };
  if (typeof params.race === "string" && typeof params.power === "string") {
    const combo = comboName(t, params.race as RaceId, params.power as PowerId);
    return t.dyn(`log.${entry.key}`, { ...params, race: combo, power: "" }).replace(/\s+\./, ".").replace(/\s{2,}/g, " ");
  }
  return t.dyn(`log.${entry.key}`, params);
}
