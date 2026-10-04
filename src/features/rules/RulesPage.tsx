import { POWERS, POWER_IDS, RACES, RACE_IDS } from "@/core/game";
import { Page } from "@/features/layout/Header";
import { FEATURE_ICONS, TERRAIN_COLORS, TERRAIN_ICONS } from "@/features/map/palette";
import { TERRAINS, FEATURES } from "@/core/map/types";
import { useT } from "@/i18n";

export function RulesPage() {
  const t = useT();
  return (
    <Page>
      <h1 className="mb-6 text-3xl font-bold">{t("rules.title")}</h1>
      <div className="card p-6">
        <RulesContent />
      </div>
    </Page>
  );
}

/** Rules text plus the race and power catalogues (also shown in-game in a modal). */
export function RulesContent() {
  const t = useT();
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <section>
        <h2 className="mb-1 text-lg font-semibold">🎯 {t("rules.goal")}</h2>
        <p className="text-text-secondary">{t("rules.goalText")}</p>
      </section>
      <section>
        <h2 className="mb-1 text-lg font-semibold">🔄 {t("rules.turn")}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-text-secondary">
          {t.list("rules.turnSteps").map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-1 text-lg font-semibold">💤 {t("rules.decline")}</h2>
        <p className="text-text-secondary">{t("rules.declineText")}</p>
      </section>
      <section>
        <h2 className="mb-1 text-lg font-semibold">⚔️ {t("rules.defence")}</h2>
        <p className="text-text-secondary">{t("rules.defenceText")}</p>
      </section>
      <section className="flex flex-wrap gap-2">
        {TERRAINS.map((terrain) => (
          <span key={terrain} className="badge">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TERRAIN_COLORS[terrain] }} />
            {TERRAIN_ICONS[terrain]} {t.dyn(`terrain.${terrain}`)}
          </span>
        ))}
        {FEATURES.map((feature) => (
          <span key={feature} className="badge">
            {FEATURE_ICONS[feature]} {t.dyn(`feature.${feature}`)}
          </span>
        ))}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">🧬 {t("rules.races")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {RACE_IDS.map((id) => (
            <li key={id} className="rounded-tile border border-border bg-canvas p-3">
              <p className="font-semibold">
                {RACES[id].icon} {t.dyn(`race.${id}.name`)} <span className="badge ml-1">{t("rules.tokens", { count: RACES[id].tokens })}</span>
              </p>
              <p className="text-xs text-text-secondary">{t.dyn(`race.${id}.desc`)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">✨ {t("rules.powers")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {POWER_IDS.map((id) => (
            <li key={id} className="rounded-tile border border-border bg-canvas p-3">
              <p className="font-semibold">
                {POWERS[id].icon} {t.dyn(`power.${id}.name`)} <span className="badge ml-1">+{POWERS[id].tokens}</span>
              </p>
              <p className="text-xs text-text-secondary">{t.dyn(`power.${id}.desc`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
