import type { BalanceIssue, BalanceReport } from "@/core/map/analysis";
import { LAND_TERRAINS, WATER_TERRAINS } from "@/core/map/types";
import { useT, type Translator } from "@/i18n";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/icons/Icon";
import { FEATURE_ICONS, TERRAIN_COLORS } from "./palette";

const tone = (score: number) => (score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger");
const ICON = { error: "⛔", warning: "⚠️", info: "ℹ️" } as const;

/** Turns an analysis issue into a sentence, translating terrain/feature ids in its params. */
export function describeIssue(t: Translator, issue: BalanceIssue): string {
  const params = { ...issue.params };
  if (typeof params.terrain === "string") params.terrain = t.dyn(`terrain.${params.terrain}`).toLowerCase();
  if (typeof params.feature === "string") params.feature = t.dyn(`feature.${params.feature}`).toLowerCase();
  return t.dyn(`balance.${issue.key}`, params);
}

export function BalanceScore({ report, compact }: { report: BalanceReport; compact?: boolean }) {
  const t = useT();
  return (
    <div className={cx("flex items-center gap-3", compact && "gap-2")}>
      <div className={cx("font-mono font-bold tabular-nums", compact ? "text-lg" : "text-4xl", tone(report.score))}>{report.score}</div>
      <div className="min-w-0">
        {!compact && <p className="text-xs uppercase tracking-wide text-text-muted">{t("balance.score")}</p>}
        <p className={cx("text-sm font-semibold", report.playable ? "text-success" : "text-danger")}>
          {report.playable ? t("balance.playable") : t("balance.unplayable")}
        </p>
      </div>
    </div>
  );
}

/** Full balance review shown next to the map editor. */
export function BalancePanel({ report }: { report: BalanceReport }) {
  const t = useT();
  const { stats } = report;
  const land = Math.max(1, stats.land);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <BalanceScore report={report} />
        {report.suitedPlayers.length > 0 && (
          <div className="text-right text-xs text-text-muted">
            {t("editor.useInGame")}
            <div className="mt-0.5 flex justify-end gap-1">
              {report.suitedPlayers.map((p) => (
                <span key={p} className="badge">
                  {p} 👤
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="label">{t("balance.stats")}</h4>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-text-muted">{t("editor.regions")}</dt>
          <dd className="text-right font-medium tabular-nums">{stats.regions}</dd>
          <dt className="text-text-muted">{t("balance.land")} / {t("balance.water")}</dt>
          <dd className="text-right font-medium tabular-nums">
            {stats.land} / {stats.water}
          </dd>
          <dt className="text-text-muted">{t("balance.edge")}</dt>
          <dd className="text-right font-medium tabular-nums">{stats.edgeLand}</dd>
          <dt className="text-text-muted">{t("balance.sizes")}</dt>
          <dd className="text-right font-medium tabular-nums">{t("balance.sizesValue", { min: stats.smallestRegion, max: stats.largestRegion })}</dd>
        </dl>
      </div>

      <div>
        <div className="mb-1 flex h-3 overflow-hidden rounded-pill border border-border">
          {LAND_TERRAINS.map((terrain) => (
            <div key={terrain} style={{ width: `${(stats.terrain[terrain] / land) * 100}%`, background: TERRAIN_COLORS[terrain] }} title={t.dyn(`terrain.${terrain}`)} />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-3 text-xs">
          {[...LAND_TERRAINS, ...WATER_TERRAINS].map((terrain) => (
            <li key={terrain} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TERRAIN_COLORS[terrain] }} />
                {t.dyn(`terrain.${terrain}`)}
              </span>
              <span className="tabular-nums text-text-muted">{stats.terrain[terrain]}</span>
            </li>
          ))}
          {(Object.keys(FEATURE_ICONS) as (keyof typeof FEATURE_ICONS)[]).map((feature) => (
            <li key={feature} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Icon name={FEATURE_ICONS[feature]} /> {t.dyn(`feature.${feature}`)}
              </span>
              <span className="tabular-nums text-text-muted">{stats.features[feature]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="label">{t("balance.title")}</h4>
        {report.issues.length === 0 ? (
          <p className="text-sm text-success">✅ {t("balance.noIssue")}</p>
        ) : (
          <ul className="space-y-1.5">
            {report.issues.map((issue, i) => (
              <li
                key={i}
                className={cx(
                  "flex gap-2 rounded-tile border px-2.5 py-1.5 text-xs",
                  issue.severity === "error" && "border-danger/50 bg-danger/10",
                  issue.severity === "warning" && "border-warning/50 bg-warning/10",
                  issue.severity === "info" && "border-border bg-surface-hover"
                )}
              >
                <span aria-hidden>{ICON[issue.severity]}</span>
                <span>{describeIssue(t, issue)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
