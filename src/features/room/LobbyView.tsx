import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeMap } from "@/core/map/analysis";
import { defaultMap } from "@/core/map/defaults";
import { formatSeconds, mapLabel } from "@/features/create/CreatePage";
import { Page } from "@/features/layout/Header";
import { MapPreview } from "@/features/map/MapPreview";
import { BalanceScore } from "@/features/map/BalancePanel";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { confirmDialog } from "@/ui/feedback";
import { ChatPanel } from "./ChatPanel";

export const inviteLink = (code: string) => `${location.origin}${location.pathname}#/join?code=${code}`;

export function LobbyView() {
  const t = useT();
  const navigate = useNavigate();
  const { view, session, leave } = useSession();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  if (!view || !session) return null;

  const { room, me, role } = view;
  const isHost = role === "host";
  const players = room.lobby.filter((p) => p.connected);
  const map = room.customMap ?? defaultMap(Math.max(2, players.length));
  const report = analyzeMap(map, Math.max(2, players.length));

  const copy = async (what: "code" | "link") => {
    await navigator.clipboard?.writeText(what === "code" ? room.code : inviteLink(room.code));
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  const quit = async () => {
    const ok = await confirmDialog({ title: t("lobby.leaveConfirm"), confirmLabel: t("lobby.leave"), cancelLabel: t("common.cancel"), danger: true });
    if (!ok) return;
    leave();
    navigate("/");
  };

  return (
    <Page wide header={<span className="truncate text-sm text-text-secondary">{t("lobby.title")}</span>}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <p className="label">{t("lobby.code")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-4xl font-bold tracking-[0.25em]">{room.code}</span>
              <Button size="sm" onClick={() => copy("code")}>
                {copied === "code" ? t("common.copied") : t("common.copy")}
              </Button>
              <Button size="sm" onClick={() => copy("link")}>
                🔗 {copied === "link" ? t("common.copied") : t("lobby.copyInvite")}
              </Button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="section-title mb-3">{t("lobby.players", { count: players.length, max: room.settings.maxPlayers })}</h2>
            <ul className="space-y-2">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-tile border border-border bg-canvas px-3 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-accent/15 font-semibold">{p.name.slice(0, 1).toUpperCase()}</span>
                  <span className="flex-1 font-medium">
                    {p.name} {p.id === me && <span className="text-text-muted">({t("common.you")})</span>}
                  </span>
                  {p.id === room.hostId && <span className="badge">👑 {t("common.host")}</span>}
                  {isHost && p.id !== me && (
                    <Button size="sm" variant="danger" onClick={() => session.kick(p.id)}>
                      {t("lobby.kick")}
                    </Button>
                  )}
                </li>
              ))}
              {Array.from({ length: Math.max(0, room.settings.maxPlayers - players.length) }, (_, i) => (
                <li key={`empty-${i}`} className="rounded-tile border border-dashed border-border px-3 py-3 text-sm text-text-muted">
                  {t("lobby.waiting")}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Button variant="danger" onClick={quit}>
                {t("lobby.leave")}
              </Button>
              {isHost ? (
                <div className="flex items-center gap-3">
                  {players.length < 2 && <span className="text-xs text-text-muted">{t("lobby.needPlayers")}</span>}
                  <Button variant="primary" size="lg" disabled={players.length < 2} onClick={() => session.start()}>
                    {t("lobby.start")}
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-text-muted">{t("lobby.waitingHost")}</span>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title mb-3">{t("lobby.settings")}</h2>
            <dl className="mb-4 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-text-muted">{t("create.turns")}</dt>
              <dd className="text-right font-medium">{room.settings.turns}</dd>
              <dt className="text-text-muted">{t("create.turnTime")}</dt>
              <dd className="text-right font-medium">{formatSeconds(t, room.settings.turnSeconds)}</dd>
              <dt className="text-text-muted">{t("create.map")}</dt>
              <dd className="truncate text-right font-medium">{room.customMap ? mapLabel(t, room.customMap) : t("create.defaultMap")}</dd>
            </dl>
            <div className="aspect-[4/3] overflow-hidden rounded-tile border border-border bg-canvas">
              <MapPreview map={map} />
            </div>
            <div className="mt-3">
              <BalanceScore report={report} compact />
            </div>
          </section>
          <section className="card flex h-72 flex-col p-5">
            <h2 className="section-title mb-2">{t("lobby.chat")}</h2>
            <ChatPanel className="flex-1" />
          </section>
        </div>
      </div>
    </Page>
  );
}
