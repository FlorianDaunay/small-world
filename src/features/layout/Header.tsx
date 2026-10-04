import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { Button } from "@/ui/Button";
import { SettingsModal } from "./SettingsModal";

/** Top bar: logo (home link), page-specific content, language toggle and settings. */
export function Header({ children }: { children?: ReactNode }) {
  const t = useT();
  const { language, setLanguage } = useProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="surface sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-x-0 border-t-0 px-4">
      <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
        <span className="text-xl" aria-hidden>
          🗺️
        </span>
        <span className="hidden sm:inline">{t("app.title")}</span>
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      <Button variant="ghost" size="sm" onClick={() => setLanguage(language === "fr" ? "en" : "fr")} title={t("settings.language")}>
        {language === "fr" ? "FR" : "EN"}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label={t("settings.title")} title={t("settings.title")}>
        ⚙️
      </Button>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}

/** Standard page: header + centred, scrollable content. */
export function Page({ children, header, wide }: { children: ReactNode; header?: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header>{header}</Header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? "max-w-7xl" : "max-w-4xl"}`}>{children}</main>
    </div>
  );
}
