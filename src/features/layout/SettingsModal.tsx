import { LANGUAGES, useT } from "@/i18n";
import { useProfile, type Language } from "@/store/profile";
import { themeToStyle, themes, useActiveTheme, useThemeStore } from "@/themes";
import { Segmented } from "@/ui/Field";
import { Modal } from "@/ui/Modal";
import { cx } from "@/ui/cx";

/** Language and theme preferences. Each theme card previews itself with its own tokens. */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { language, setLanguage } = useProfile();
  const active = useActiveTheme();
  const { followSystem, selectTheme, setFollowSystem } = useThemeStore();

  return (
    <Modal open={open} onClose={onClose} title={t("settings.title")} size="xl">
      <div className="space-y-6">
        <section>
          <h3 className="label">{t("settings.language")}</h3>
          <div className="max-w-xs">
            <Segmented<Language>
              value={language}
              onChange={setLanguage}
              options={Object.entries(LANGUAGES).map(([value, { label }]) => ({ value: value as Language, label }))}
            />
          </div>
        </section>
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="label mb-0">
              {t("settings.theme")} · <span className="normal-case">{t("settings.themeCount", { count: themes.length })}</span>
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={followSystem} onChange={(e) => setFollowSystem(e.target.checked)} className="accent-[rgb(var(--color-accent))]" />
              {t("settings.followSystem")}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => selectTheme(theme.id)}
                style={themeToStyle(theme)}
                className={cx(
                  "rounded-card border bg-canvas p-2 text-left transition-transform hover:-translate-y-0.5",
                  theme.id === active.id ? "border-accent ring-2 ring-accent" : "border-border"
                )}
              >
                <div className="surface rounded-tile p-2 shadow-card">
                  <div className="mb-1.5 flex gap-1">
                    <span className="h-2.5 w-6 rounded-pill bg-accent" />
                    <span className="h-2.5 w-3 rounded-pill bg-success" />
                    <span className="h-2.5 w-3 rounded-pill bg-warning" />
                    <span className="h-2.5 w-3 rounded-pill bg-danger" />
                  </div>
                  <p className="truncate font-sans text-sm font-semibold text-text-primary">{theme.name}</p>
                  <p className="line-clamp-2 font-sans text-[11px] leading-tight text-text-muted">{theme.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
