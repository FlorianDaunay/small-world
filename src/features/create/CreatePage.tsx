import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { defaultTurns, type ExtensionId, type GameSettings } from "@/core/game";
import { analyzeMap } from "@/core/map/analysis";
import { defaultMap } from "@/core/map/defaults";
import { Page } from "@/features/layout/Header";
import { Ambiance } from "@/features/extensions/Ambiance";
import { ExtensionPicker } from "@/features/extensions/ExtensionPicker";
import { mapAtmosphere } from "@/features/extensions/art";
import { NameField } from "@/features/layout/NameField";
import { BalanceScore, describeIssue } from "@/features/map/BalancePanel";
import { MapPreview } from "@/features/map/MapPreview";
import { useT, type Translator } from "@/i18n";
import { allMaps, useMaps } from "@/store/maps";
import { useProfile } from "@/store/profile";
import { useSaves, type SaveEntry } from "@/store/saves";
import { useSession } from "@/store/session";
import { pickJsonFile } from "@/store/storage";
import { Button } from "@/ui/Button";
import { Field, Segmented, Select, TextInput } from "@/ui/Field";
import { Tabs } from "@/ui/Tabs";
import { confirmDialog, toast } from "@/ui/feedback";
import { Icon } from "@/ui/icons/Icon";

const TURN_TIMES = [0, 60, 90, 120, 180, 300];
const DEFAULT_MAP = "default";

export const formatSeconds = (t: Translator, seconds: number) =>
  seconds === 0 ? t("common.unlimited") : seconds < 60 || seconds % 60 ? t("common.seconds", { count: seconds }) : t("common.minutes", { count: seconds / 60 });

/** Map display name: built-in maps are named by their player count. */
export const mapLabel = (t: Translator, map: { name: string; builtIn?: boolean; id: string }) =>
  map.builtIn ? `${t("editor.builtIn")} · ${t("common.players", { count: map.id.replace(/\D/g, "") })}` : map.name;

export function CreatePage() {
  const t = useT();
  const [tab, setTab] = useState<"new" | "resume">("new");
  const clearError = useSession((s) => s.clearError);
  useEffect(() => clearError(), [clearError, tab]);
  return (
    <Page>
      <h1 className="mb-6 text-3xl font-bold">{t("create.title")}</h1>
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "new", label: t("create.tabNew") },
            { value: "resume", label: t("create.tabResume") },
          ]}
        />
      </div>
      {tab === "new" ? <NewGameForm /> : <ResumeList />}
    </Page>
  );
}

function NewGameForm() {
  const t = useT();
  const navigate = useNavigate();
  const name = useProfile((s) => s.name);
  const custom = useMaps((s) => s.custom);
  const { host, busy, error } = useSession();
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [turns, setTurns] = useState(defaultTurns(4));
  const [turnSeconds, setTurnSeconds] = useState(120);
  const [reinforcementDie, setReinforcementDie] = useState(true);
  const [mapId, setMapId] = useState(DEFAULT_MAP);
  const [extensions, setExtensions] = useState<ExtensionId[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const maps = allMaps(custom);
  const map = mapId === DEFAULT_MAP ? defaultMap(maxPlayers) : maps.find((m) => m.id === mapId) ?? defaultMap(maxPlayers);
  const report = useMemo(() => analyzeMap(map, maxPlayers), [map, maxPlayers]);

  const changePlayers = (count: number) => {
    setMaxPlayers(count);
    setTurns(defaultTurns(count));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !password || !report.playable) return;
    const settings: GameSettings = { maxPlayers, turns, turnSeconds, mapId, reinforcementDie, extensions };
    if (await host({ password, settings, customMap: mapId === DEFAULT_MAP ? null : map })) navigate("/room");
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Ambiance extensions={extensions} fixed />
      <div className="card space-y-5 p-5">
        <NameField showError={submitted} />
        <Field label={t("create.password")} hint={t("create.passwordHint")} error={submitted && !password ? t("create.passwordRequired") : undefined}>
          {(id) => <TextInput id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label={t("create.maxPlayers")}>
          {(id) => <Segmented id={id} value={maxPlayers} onChange={changePlayers} options={[2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} />}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("create.turns")} hint={t("create.turnsHint", { count: defaultTurns(maxPlayers) })}>
            {(id) => <Select id={id} value={turns} onChange={setTurns} options={Array.from({ length: 13 }, (_, i) => ({ value: i + 3, label: String(i + 3) }))} />}
          </Field>
          <Field label={t("create.turnTime")}>
            {(id) => <Select id={id} value={turnSeconds} onChange={setTurnSeconds} options={TURN_TIMES.map((s) => ({ value: s, label: formatSeconds(t, s) }))} />}
          </Field>
        </div>
        <Field label={t("create.reinforcementDie")} hint={t("create.reinforcementDieHint")}>
          {(id) => (
            <Segmented
              id={id}
              value={reinforcementDie ? "on" : "off"}
              onChange={(v) => setReinforcementDie(v === "on")}
              options={[
                { value: "on", label: t("create.enabled") },
                { value: "off", label: t("create.disabled") },
              ]}
            />
          )}
        </Field>
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <Field label={t("create.map")}>
          {(id) => (
            <Select
              id={id}
              value={mapId}
              onChange={setMapId}
              options={[{ value: DEFAULT_MAP, label: t("create.defaultMap") }, ...maps.map((m) => ({ value: m.id, label: mapLabel(t, m) }))]}
            />
          )}
        </Field>
        <div className="aspect-[4/3] overflow-hidden rounded-tile border border-border bg-canvas">
          <MapPreview map={map} atmosphere={mapAtmosphere(extensions)} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <BalanceScore report={report} compact />
          <div className="text-right text-xs text-text-muted">
            {!report.playable
              ? t("create.mapUnplayable")
              : !report.suitedPlayers.includes(maxPlayers)
                ? t("create.mapUnsuited", { players: maxPlayers })
                : report.issues[0] && describeIssue(t, report.issues[0])}
          </div>
        </div>
      </div>

      <section className="card space-y-4 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="puzzle" className="h-5 w-5 text-accent" /> {t("create.extensions")}
          </h2>
          <span className="badge">{extensions.length ? t("create.extensionsCount", { count: extensions.length }) : t("create.extensionsBase")}</span>
        </div>
        <p className="text-sm text-text-muted">{t("create.extensionsHint")}</p>
        <ExtensionPicker value={extensions} onChange={setExtensions} />
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end lg:col-span-2">
        {error && <p className="text-sm text-danger sm:mr-auto">{t.dyn(`errors.${error}`)}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? t("common.loading") : t("create.open")}
        </Button>
      </div>
    </form>
  );
}

function ResumeList() {
  const t = useT();
  const navigate = useNavigate();
  const name = useProfile((s) => s.name);
  const { saves, remove, importSave } = useSaves();
  const { host, busy, error } = useSession();
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const resume = async (save: SaveEntry) => {
    if (!name.trim()) return toast(t("home.nameRequired"), "danger");
    const password = passwords[save.id] ?? save.password;
    if (!password) return toast(t("create.passwordRequired"), "danger");
    if (await host({ password, settings: save.game.settings, customMap: null, game: save.game })) navigate("/room");
  };

  const importFile = async () => {
    try {
      if (!importSave(await pickJsonFile())) toast(t("create.importFailed"), "danger");
    } catch {
      toast(t("create.importFailed"), "danger");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">{t("create.resumeHint")}</p>
        <Button size="sm" onClick={importFile}>
          📂 {t("create.importSave")}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{t.dyn(`errors.${error}`)}</p>}
      {saves.length === 0 && <p className="card p-8 text-center text-text-muted">{t("create.noSaves")}</p>}
      {saves.map((save) => {
        const { game } = save;
        const finished = game.turn.phase === "finished";
        return (
          <div key={save.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="h-24 w-full shrink-0 overflow-hidden rounded-tile border border-border bg-canvas sm:w-36">
              <MapPreview map={game.map} atmosphere={mapAtmosphere(game.settings.extensions ?? [])} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{game.players.map((p) => p.name).join(", ")}</span>
                <span className="badge">{finished ? t("create.finished") : t("create.saveTurn", { turn: game.turn.number, turns: game.settings.turns })}</span>
              </div>
              <p className="text-xs text-text-muted">{t("create.savedAt", { date: new Date(save.savedAt).toLocaleString(t.language) })}</p>
              {!finished && (
                <TextInput
                  type="password"
                  className="mt-2 max-w-xs"
                  placeholder={t("create.password")}
                  value={passwords[save.id] ?? save.password}
                  onChange={(e) => setPasswords({ ...passwords, [save.id]: e.target.value })}
                />
              )}
            </div>
            <div className="flex gap-2">
              {!finished && (
                <Button variant="primary" disabled={busy} onClick={() => resume(save)}>
                  {t("create.resume")}
                </Button>
              )}
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirmDialog({ title: t("create.deleteSave"), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel"), danger: true });
                  if (ok) remove(save.id);
                }}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
