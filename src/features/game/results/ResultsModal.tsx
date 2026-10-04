import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PlayerState, PlayerStats } from "@/core/game";
import { RaceEmblem } from "@/features/cards/Cards";
import { playerColor } from "@/features/map/palette";
import { useT, type TranslationKey } from "@/i18n";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import { Tabs } from "@/ui/Tabs";
import { cx } from "@/ui/cx";
import { Icon, type IconName } from "@/ui/icons/Icon";
import { raceName } from "../text";
import { useGame } from "../useGame";
import { CoinsChart } from "./CoinsChart";

type Tab = "ranking" | "chart" | "details";

interface Metric {
  key: TranslationKey;
  value: (p: PlayerState) => number;
  format?: (p: PlayerState) => string;
  /** Which end is "best" (gets the crown); none for neutral metrics. */
  best?: "max" | "min";
}

const ratio = (s: PlayerStats) => (s.rolls ? s.rollsWon / s.rolls : 0);

const METRICS: Metric[] = [
  { key: "results.metric.coins", value: (p) => p.coins, best: "max" },
  { key: "results.metric.earnedRegions", value: (p) => p.stats.earnedRegions, best: "max" },
  { key: "results.metric.earnedBonus", value: (p) => p.stats.earnedBonus, best: "max" },
  { key: "results.metric.bestTurn", value: (p) => Math.max(0, ...p.history), best: "max" },
  { key: "results.metric.coinsCollected", value: (p) => p.stats.coinsCollected, best: "max" },
  { key: "results.metric.coinsSpent", value: (p) => p.stats.coinsSpent },
  { key: "results.metric.conquests", value: (p) => p.stats.conquests, best: "max" },
  { key: "results.metric.attacks", value: (p) => p.stats.attacks, best: "max" },
  { key: "results.metric.tribes", value: (p) => p.stats.tribes, best: "max" },
  { key: "results.metric.regionsLost", value: (p) => p.stats.regionsLost, best: "min" },
  { key: "results.metric.tokensLost", value: (p) => p.stats.tokensLost, best: "min" },
  { key: "results.metric.peakRegions", value: (p) => p.stats.peakRegions, best: "max" },
  { key: "results.metric.rolls", value: (p) => ratio(p.stats), format: (p) => `${p.stats.rollsWon}/${p.stats.rolls}`, best: "max" },
  { key: "results.metric.declines", value: (p) => p.stats.declines },
  { key: "results.metric.races", value: (p) => p.stats.races.length },
];

/** Fun titles handed to whoever leads a statistic (only when someone actually did it). */
const AWARDS: { key: TranslationKey; icon: IconName; value: (p: PlayerState) => number }[] = [
  { key: "results.award.conqueror", icon: "swords", value: (p) => p.stats.conquests },
  { key: "results.award.warlord", icon: "brokenShield", value: (p) => p.stats.attacks },
  { key: "results.award.explorer", icon: "lostTribe", value: (p) => p.stats.tribes },
  { key: "results.award.tactician", icon: "laurels", value: (p) => p.stats.earnedBonus },
  { key: "results.award.lucky", icon: "dice", value: (p) => (p.stats.rolls ? ratio(p.stats) * 10 + p.stats.rollsWon : 0) },
];

function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}

export function ResultsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const leave = useSession((s) => s.leave);
  const { game, me } = useGame();
  const [tab, setTab] = useState<Tab>("ranking");
  const ranking = [...game.players].sort((a, b) => b.coins - a.coins);
  const winners = game.players.filter((p) => game.winners.includes(p.id)).map((p) => p.name).join(", ");
  const iWon = game.winners.includes(me);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Icon name="trophy" className="h-5 w-5 text-warning" /> {t("game.results")}
        </span>
      }
      footer={
        <Button
          variant="primary"
          onClick={() => {
            leave();
            navigate("/");
          }}
        >
          {t("game.backHome")}
        </Button>
      }
    >
      <div className="mb-4 rounded-card border border-border bg-accent/10 p-4 text-center">
        <p className="text-lg font-bold">{t(game.winners.length > 1 ? "game.winners" : "game.winner", { names: winners })}</p>
        <p className="mt-1 text-xs text-text-muted">
          {iWon ? `${t("results.congrats")} · ` : ""}
          {t("results.summary", { turns: game.settings.turns, duration: formatDuration(game.updatedAt - game.createdAt) })}
        </p>
      </div>
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "ranking", label: t("results.tabRanking") },
            { value: "chart", label: t("results.tabChart") },
            { value: "details", label: t("results.tabDetails") },
          ]}
        />
      </div>

      {tab === "ranking" && (
        <div className="space-y-4">
          <ol className="space-y-2">
            {ranking.map((p, i) => (
              <li key={p.id} className={cx("rounded-tile border bg-canvas p-3", i === 0 ? "border-warning" : "border-border")}>
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      "flex h-8 w-8 items-center justify-center rounded-pill font-bold",
                      i === 0 ? "bg-warning/20 text-warning" : "bg-surface-hover text-text-secondary"
                    )}
                  >
                    {i === 0 ? <Icon name="crown" className="h-5 w-5" /> : i + 1}
                  </span>
                  <span className="h-3 w-3 rounded-pill" style={{ background: playerColor(p.color) }} />
                  <span className="flex-1 font-semibold">
                    {p.name} {p.id === me && <span className="font-normal text-text-muted">({t("common.you")})</span>}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-lg font-bold tabular-nums">
                    <Icon name="coins" className="h-4 w-4 text-warning" /> {p.coins}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-11">
                  {p.stats.races.map((r, k) => (
                    <span key={k} className="badge">
                      <RaceEmblem race={r.race} size="xs" className="h-4 w-4 ring-0" /> {raceName(t, r.race)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <Awards players={game.players} />
        </div>
      )}

      {tab === "chart" && (
        <section>
          <h3 className="section-title mb-2">{t("results.chartTitle")}</h3>
          <CoinsChart players={game.players} />
        </section>
      )}

      {tab === "details" && <DetailsTable players={ranking} />}
    </Modal>
  );
}

function Awards({ players }: { players: PlayerState[] }) {
  const t = useT();
  const awards = AWARDS.map((award) => {
    const best = Math.max(...players.map(award.value));
    const holders = players.filter((p) => award.value(p) === best);
    return best > 0 && holders.length < players.length ? { ...award, holders } : null;
  }).filter(Boolean) as ((typeof AWARDS)[number] & { holders: PlayerState[] })[];
  if (!awards.length) return null;
  return (
    <section>
      <h3 className="section-title mb-2">{t("results.awards")}</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {awards.map((a) => (
          <li key={a.key} className="flex items-center gap-3 rounded-tile border border-border bg-canvas p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-accent/15 text-accent">
              <Icon name={a.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(a.key)}</span>
              <span className="block truncate text-xs text-text-muted">{a.holders.map((p) => p.name).join(", ")}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailsTable({ players }: { players: PlayerState[] }) {
  const t = useT();
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface px-2 py-2 text-left text-xs font-medium text-text-muted" />
            {players.map((p) => (
              <th key={p.id} className="px-2 py-2 text-right text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-pill" style={{ background: playerColor(p.color) }} />
                  {p.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const values = players.map(m.value);
            const target = m.best === "max" ? Math.max(...values) : m.best === "min" ? Math.min(...values) : null;
            const unique = target !== null && values.filter((v) => v === target).length < players.length;
            return (
              <tr key={m.key} className="border-t border-border">
                <th scope="row" className="sticky left-0 bg-surface px-2 py-1.5 text-left text-xs font-medium text-text-secondary">
                  {t(m.key)}
                </th>
                {players.map((p, i) => {
                  const best = unique && values[i] === target;
                  return (
                    <td key={p.id} className={cx("px-2 py-1.5 text-right font-mono tabular-nums", best && "font-bold text-text-primary")}>
                      <span className="inline-flex items-center gap-1">
                        {best && <Icon name="crown" className="h-3.5 w-3.5 text-warning" label={t("results.best")} />}
                        {m.format ? m.format(p) : values[i]}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
