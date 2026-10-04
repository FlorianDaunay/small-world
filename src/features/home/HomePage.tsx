import { Link } from "react-router-dom";
import { Page } from "@/features/layout/Header";
import { NameField } from "@/features/layout/NameField";
import { useT, type TranslationKey } from "@/i18n";
import { useSession } from "@/store/session";
import { APP_VERSION } from "@/version";

const ENTRIES: { to: string; icon: string; title: TranslationKey; desc: TranslationKey; primary?: boolean }[] = [
  { to: "/create", icon: "⚔️", title: "home.create", desc: "home.createDesc", primary: true },
  { to: "/join", icon: "🤝", title: "home.join", desc: "home.joinDesc", primary: true },
  { to: "/editor", icon: "🧭", title: "home.editor", desc: "home.editorDesc" },
  { to: "/rules", icon: "📜", title: "home.rules", desc: "home.rulesDesc" },
];

export function HomePage() {
  const t = useT();
  const view = useSession((s) => s.view);
  const inRoom = view && view.status !== "closed";

  return (
    <Page>
      <section className="mb-10 text-center">
        <div className="mb-3 text-6xl" aria-hidden>
          🗺️
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t("app.title")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">{t("app.tagline")}</p>
      </section>

      {inRoom && (
        <Link to="/room" className="card mb-6 flex items-center justify-between gap-4 border-accent px-5 py-4 hover:bg-surface-hover">
          <span className="font-semibold">{t("home.resumeCurrent")}</span>
          <span className="badge">{view.room.code}</span>
        </Link>
      )}

      <div className="card mx-auto mb-8 max-w-md p-5">
        <NameField />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className={`card group flex items-start gap-4 p-5 transition-transform hover:-translate-y-0.5 hover:bg-surface-hover ${entry.primary ? "" : "opacity-95"}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile bg-accent/15 text-2xl">{entry.icon}</span>
            <span>
              <span className="block text-lg font-semibold group-hover:text-accent">{t(entry.title)}</span>
              <span className="block text-sm text-text-secondary">{t(entry.desc)}</span>
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-12 space-y-1 text-center text-xs text-text-muted">
        <p>🔒 {t("home.p2p")}</p>
        <p>{t("app.disclaimer")}</p>
        <p className="font-mono">v{APP_VERSION}</p>
      </footer>
    </Page>
  );
}
