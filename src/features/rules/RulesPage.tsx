import { EVENT_IDS, EXTENSIONS, EXTENSION_IDS, POWER_IDS, RACE_IDS, isBaseContent } from "@/core/game";
import { FEATURES, TERRAINS } from "@/core/map/types";
import { CatalogueCard } from "@/features/cards/Cards";
import { ExtensionEmblem } from "@/features/extensions/ExtensionPicker";
import { EVENT_ART, EXTENSION_ART } from "@/features/extensions/art";
import { Page } from "@/features/layout/Header";
import { FEATURE_COLORS, FEATURE_ICONS, TERRAIN_COLORS, TERRAIN_ICONS } from "@/features/map/palette";
import { useT } from "@/i18n";
import { Icon, type IconName } from "@/ui/icons/Icon";

export function RulesPage() {
  const t = useT();
  return (
    <Page>
      <h1 className="mb-6 text-3xl font-bold">{t("rules.title")}</h1>
      <div className="card p-4 sm:p-6">
        <RulesContent />
      </div>
    </Page>
  );
}

function Heading({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-accent/15 text-accent">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {children}
    </h2>
  );
}

/** Rules text plus the race and power catalogues (also shown in-game in a modal). */
export function RulesContent() {
  const t = useT();
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <section>
        <Heading icon="target">{t("rules.goal")}</Heading>
        <p className="text-text-secondary">{t("rules.goalText")}</p>
      </section>
      <section>
        <Heading icon="hourglass">{t("rules.turn")}</Heading>
        <ol className="list-decimal space-y-1 pl-5 text-text-secondary">
          {t.list("rules.turnSteps").map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <Heading icon="decline">{t("rules.decline")}</Heading>
        <p className="text-text-secondary">{t("rules.declineText")}</p>
      </section>
      <section>
        <Heading icon="swords">{t("rules.defence")}</Heading>
        <p className="text-text-secondary">{t("rules.defenceText")}</p>
      </section>
      <section className="flex flex-wrap gap-2">
        {TERRAINS.map((terrain) => (
          <span key={terrain} className="badge">
            <span className="flex h-4 w-4 items-center justify-center rounded-sm text-[#1d1a16]" style={{ background: TERRAIN_COLORS[terrain] }}>
              <Icon name={TERRAIN_ICONS[terrain]} className="h-3 w-3" />
            </span>
            {t.dyn(`terrain.${terrain}`)}
          </span>
        ))}
        {FEATURES.map((feature) => (
          <span key={feature} className="badge">
            <span className="flex h-4 w-4 items-center justify-center rounded-pill text-white" style={{ background: FEATURE_COLORS[feature] }}>
              <Icon name={FEATURE_ICONS[feature]} className="h-3 w-3" />
            </span>
            {t.dyn(`feature.${feature}`)}
          </span>
        ))}
      </section>
      <section>
        <Heading icon="person">{t("rules.races")}</Heading>
        <ul className="grid gap-2 sm:grid-cols-2">
          {RACE_IDS.filter(isBaseContent).map((id) => (
            <CatalogueCard key={id} kind="race" id={id} />
          ))}
        </ul>
      </section>
      <section>
        <Heading icon="magic">{t("rules.powers")}</Heading>
        <ul className="grid gap-2 sm:grid-cols-2">
          {POWER_IDS.filter(isBaseContent).map((id) => (
            <CatalogueCard key={id} kind="power" id={id} />
          ))}
        </ul>
      </section>
      <section>
        <Heading icon="puzzle">{t("rules.extensions")}</Heading>
        <p className="mb-3 text-text-secondary">{t("rules.extensionsText")}</p>
        <div className="space-y-3">
          {EXTENSION_IDS.map((id) => (
            <ExtensionRules key={id} id={id} />
          ))}
        </div>
      </section>
      <p className="text-xs text-text-muted">{t("rules.credits")}</p>
    </div>
  );
}

function ExtensionRules({ id }: { id: (typeof EXTENSION_IDS)[number] }) {
  const t = useT();
  const def = EXTENSIONS[id];
  const [main, second] = EXTENSION_ART[id].colors;
  return (
    <article className="overflow-hidden rounded-tile border border-border bg-canvas">
      <header className="flex items-center gap-3 p-3" style={{ background: `linear-gradient(135deg, ${main}29, ${second}12 60%, transparent)` }}>
        <ExtensionEmblem id={id} />
        <div className="min-w-0">
          <h3 className="font-semibold">{t.dyn(`extension.${id}.name`)}</h3>
          <p className="text-xs text-text-secondary">{t.dyn(`extension.${id}.desc`)}</p>
        </div>
      </header>
      {(def.races.length > 0 || def.powers.length > 0) && (
        <ul className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
          {def.races.map((race) => (
            <CatalogueCard key={race} kind="race" id={race} />
          ))}
          {def.powers.map((power) => (
            <CatalogueCard key={power} kind="power" id={power} />
          ))}
        </ul>
      )}
      {def.events && (
        <ul className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
          {EVENT_IDS.map((event) => (
            <li key={event} className="flex items-start gap-2 rounded-tile border border-border p-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill p-1 text-white" style={{ background: EVENT_ART[event].color }}>
                <Icon name={EVENT_ART[event].icon} className="h-full w-full" />
              </span>
              <span className="text-xs">
                <strong className="block text-sm">{t.dyn(`event.${event}.name`)}</strong>
                <span className="text-text-secondary">{t.dyn(`event.${event}.desc`)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
