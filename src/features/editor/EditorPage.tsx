import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeMap } from "@/core/map/analysis";
import { addRegion, blankMap, compactMap, paintCell, removeRegion, resizeMap, setTerrain, toggleFeature } from "@/core/map/edit";
import { MAP_PRESETS, generateMap } from "@/core/map/generator";
import { buildTopology } from "@/core/map/topology";
import { FEATURES, TERRAINS, type GameMap } from "@/core/map/types";
import { randomSeed } from "@/core/util/rng";
import { uid } from "@/core/util/id";
import { mapLabel } from "@/features/create/CreatePage";
import { Header } from "@/features/layout/Header";
import { BalancePanel } from "@/features/map/BalancePanel";
import { HexMap } from "@/features/map/HexMap";
import { FEATURE_ICONS, TERRAIN_COLORS, TERRAIN_ICONS } from "@/features/map/palette";
import { useT } from "@/i18n";
import { allMaps, useMaps } from "@/store/maps";
import { downloadJson, pickJsonFile } from "@/store/storage";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Field";
import { confirmDialog, toast } from "@/ui/feedback";
import { cx } from "@/ui/cx";

type Tool = "pick" | "paint" | "new" | "erase";
const TOOLS: { id: Tool; icon: string; label: "editor.toolPick" | "editor.toolPaint" | "editor.toolNewRegion" | "editor.toolErase" }[] = [
  { id: "pick", icon: "👆", label: "editor.toolPick" },
  { id: "paint", icon: "🖌️", label: "editor.toolPaint" },
  { id: "new", icon: "➕", label: "editor.toolNewRegion" },
  { id: "erase", icon: "🧽", label: "editor.toolErase" },
];
const MAX_HISTORY = 60;

export function EditorPage() {
  const t = useT();
  const { custom, save, remove, importMap } = useMaps();
  const maps = allMaps(custom);
  const [draft, setDraft] = useState<GameMap>(() => maps[0]);
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<Tool>("pick");
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<GameMap[]>([]);
  const [regionTarget, setRegionTarget] = useState(MAP_PRESETS[4].regions);
  const readOnly = !!draft.builtIn;

  const topology = useMemo(() => buildTopology(draft), [draft]);
  const report = useMemo(() => analyzeMap(draft), [draft]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /** Every edit goes through here: keeps an undo stack and the dirty flag. */
  const edit = useCallback((next: GameMap, snapshot = true) => {
    if (next === draftRef.current) return;
    if (snapshot) setHistory((h) => [...h.slice(-MAX_HISTORY + 1), draftRef.current]);
    setDraft(next);
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setDraft(h[h.length - 1]);
      setSelected(null);
      return h.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const confirmDiscard = async () =>
    !dirty || (await confirmDialog({ title: t("editor.unsaved"), confirmLabel: t("common.confirm"), cancelLabel: t("common.cancel"), danger: true }));

  const open = async (map: GameMap) => {
    if (!(await confirmDiscard())) return;
    setDraft(map);
    setHistory([]);
    setSelected(null);
    setDirty(false);
  };

  const createNew = async () => {
    if (!(await confirmDiscard())) return;
    const preset = MAP_PRESETS[4];
    setDraft(generateMap({ ...preset, seed: randomSeed(), id: uid(), name: t("editor.untitled") }));
    setHistory([]);
    setSelected(null);
    setDirty(true);
  };

  const onCell = useCallback(
    (cell: number, dragging: boolean) => {
      if (readOnly) return;
      const map = draftRef.current;
      const region = map.cells[cell];
      if (tool === "pick") {
        if (!dragging) setSelected(region >= 0 ? region : null);
      } else if (tool === "erase") {
        edit(paintCell(map, cell, -1), !dragging);
      } else if (tool === "new") {
        if (dragging) return;
        const created = addRegion(map, region >= 0 ? map.regions[region].terrain : "farmland");
        edit(paintCell(created.map, cell, created.region));
        setSelected(created.region);
        setTool("paint");
      } else if (tool === "paint") {
        if (selected == null) {
          if (!dragging) setSelected(region >= 0 ? region : null);
          return;
        }
        edit(paintCell(map, cell, selected), !dragging);
      }
    },
    [tool, selected, readOnly, edit]
  );

  const persist = () => {
    const saved = save(compactMap({ ...draft, name: draft.name.trim() || t("editor.untitled") }));
    setDraft(saved);
    setDirty(false);
    setSelected(null);
    toast(t("editor.saved"), "success");
  };

  const duplicate = () => {
    setDraft({ ...structuredClone(draft), id: uid(), name: t("editor.copyOf", { name: mapLabel(t, draft) }), builtIn: false, createdAt: Date.now() });
    setHistory([]);
    setDirty(true);
  };

  const deleteMap = async () => {
    if (!(await confirmDialog({ title: t("editor.deleteConfirm"), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel"), danger: true }))) return;
    remove(draft.id);
    setDraft(maps[0]);
    setDirty(false);
    setHistory([]);
  };

  const regenerate = async () => {
    if (!(await confirmDialog({ title: t("editor.generateConfirm"), confirmLabel: t("common.confirm"), cancelLabel: t("common.cancel") }))) return;
    const cells = draft.cols * draft.rows;
    const regions = Math.max(4, Math.min(regionTarget, Math.floor(cells / 2)));
    edit({ ...generateMap({ cols: draft.cols, rows: draft.rows, regions, seed: randomSeed(), id: draft.id, name: draft.name }), createdAt: draft.createdAt });
    setSelected(null);
  };

  const importFile = async () => {
    try {
      const map = importMap(await pickJsonFile());
      if (!map) return toast(t("editor.importFailed"), "danger");
      await open(map);
    } catch {
      toast(t("editor.importFailed"), "danger");
    }
  };

  const sizeOptions = Array.from({ length: 21 }, (_, i) => ({ value: i + 6, label: String(i + 6) }));
  const region = selected != null ? draft.regions[selected] : null;

  return (
    <div className="flex h-full flex-col">
      <Header>
        <span className="truncate text-sm text-text-secondary">{t("editor.title")}</span>
        {dirty && <span className="badge text-warning">● {t("editor.unsaved")}</span>}
      </Header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map list */}
        <aside className="surface flex w-full shrink-0 flex-col gap-2 border-y-0 border-l-0 p-3 lg:w-60">
          <div className="flex gap-2">
            <Button size="sm" variant="primary" className="flex-1" onClick={createNew}>
              ➕ {t("editor.newMap")}
            </Button>
            <Button size="sm" onClick={importFile} title={t("common.import")}>
              📂
            </Button>
          </div>
          <h2 className="label mt-2">{t("editor.maps")}</h2>
          <ul className="scrollbar-thin flex max-h-48 flex-col gap-1 overflow-y-auto lg:max-h-none lg:flex-1">
            {maps.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  className={cx("w-full truncate rounded-control px-2.5 py-1.5 text-left text-sm", m.id === draft.id ? "bg-accent/15 font-semibold text-text-primary" : "text-text-secondary hover:bg-surface-hover")}
                >
                  {m.builtIn ? "🔒 " : "🗺️ "}
                  {mapLabel(t, m)}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Canvas */}
        <main className="flex min-h-[50vh] min-w-0 flex-1 flex-col">
          <div className="surface flex flex-wrap items-center gap-2 border-x-0 border-t-0 px-3 py-2">
            <input
              className="input w-48 py-1.5"
              value={readOnly ? mapLabel(t, draft) : draft.name}
              disabled={readOnly}
              aria-label={t("editor.name")}
              onChange={(e) => edit({ ...draft, name: e.target.value }, false)}
            />
            {!readOnly && (
              <>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  {t("editor.cols")}
                  <Select className="w-16 py-1" value={draft.cols} options={sizeOptions} onChange={(cols) => (edit(resizeMap(draft, cols, draft.rows)), setSelected(null))} />
                  {t("editor.rows")}
                  <Select className="w-16 py-1" value={draft.rows} options={sizeOptions} onChange={(rows) => (edit(resizeMap(draft, draft.cols, rows)), setSelected(null))} />
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  {t("editor.regions")}
                  <Select className="w-16 py-1" value={regionTarget} options={Array.from({ length: 50 }, (_, i) => ({ value: i + 10, label: String(i + 10) }))} onChange={setRegionTarget} />
                  <Button size="sm" onClick={regenerate}>
                    🎲 {t("editor.generate")}
                  </Button>
                </div>
                <Button size="sm" onClick={() => (edit(blankMap(draft.id, draft.name, draft.cols, draft.rows)), setSelected(null))}>
                  {t("editor.blank")}
                </Button>
              </>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              {!readOnly && (
                <Button size="sm" onClick={undo} disabled={!history.length} title="Ctrl+Z">
                  ↶
                </Button>
              )}
              <Button size="sm" onClick={duplicate}>
                {t("common.duplicate")}
              </Button>
              <Button size="sm" onClick={() => downloadJson(`map-${draft.name || draft.id}.json`, compactMap(draft))}>
                {t("common.export")}
              </Button>
              {!readOnly && (
                <>
                  <Button size="sm" variant="danger" onClick={deleteMap} disabled={!custom.some((m) => m.id === draft.id)}>
                    {t("common.delete")}
                  </Button>
                  <Button size="sm" variant="primary" onClick={persist} disabled={!dirty}>
                    💾 {t("common.save")}
                  </Button>
                </>
              )}
            </div>
          </div>
          {readOnly ? (
            <p className="bg-warning/10 px-3 py-1.5 text-xs text-text-secondary">🔒 {t("editor.readOnly")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
              {TOOLS.map((tl) => (
                <button
                  key={tl.id}
                  type="button"
                  onClick={() => setTool(tl.id)}
                  className={cx("btn btn-sm", tool === tl.id && "btn-primary")}
                  aria-pressed={tool === tl.id}
                >
                  {tl.icon} {t(tl.label)}
                </button>
              ))}
              <span className="ml-2 hidden text-xs text-text-muted xl:inline">{t("editor.help")}</span>
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            <HexMap
              map={draft}
              topology={topology}
              showEmptyCells={!readOnly}
              selected={selected}
              onCellPointer={onCell}
              onRegionClick={readOnly ? setSelected : undefined}
              renderOverlay={(r, { x, y }) => (
                <text x={x} y={y + 0.2} fontSize={0.6} textAnchor="middle">
                  {draft.regions[r].features.map((f) => FEATURE_ICONS[f]).join("")}
                </text>
              )}
            />
          </div>
        </main>

        {/* Inspector */}
        <aside className="surface scrollbar-thin w-full shrink-0 space-y-5 overflow-y-auto border-y-0 border-r-0 p-4 lg:w-80">
          <section>
            <h2 className="section-title mb-2">{t("editor.selected")}</h2>
            {region && selected != null ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {TERRAINS.map((terrain) => (
                    <button
                      key={terrain}
                      type="button"
                      disabled={readOnly}
                      onClick={() => edit(setTerrain(draft, selected, terrain))}
                      className={cx(
                        "flex items-center gap-2 rounded-control border px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-60",
                        region.terrain === terrain ? "border-accent ring-1 ring-accent" : "border-border hover:bg-surface-hover"
                      )}
                    >
                      <span className="h-3.5 w-3.5 rounded-sm" style={{ background: TERRAIN_COLORS[terrain] }} />
                      {TERRAIN_ICONS[terrain]} {t.dyn(`terrain.${terrain}`)}
                    </button>
                  ))}
                </div>
                <div>
                  <h3 className="label">{t("editor.features")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURES.map((feature) => (
                      <button
                        key={feature}
                        type="button"
                        disabled={readOnly}
                        onClick={() => edit(toggleFeature(draft, selected, feature))}
                        aria-pressed={region.features.includes(feature)}
                        className={cx("btn btn-sm", region.features.includes(feature) && "btn-primary")}
                      >
                        {FEATURE_ICONS[feature]} {t.dyn(`feature.${feature}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {!readOnly && (
                  <Button size="sm" variant="danger" onClick={() => (edit(removeRegion(draft, selected)), setSelected(null))}>
                    {t("common.delete")}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">{t("editor.noSelection")}</p>
            )}
          </section>
          <section>
            <BalancePanel report={report} />
          </section>
        </aside>
      </div>
    </div>
  );
}
