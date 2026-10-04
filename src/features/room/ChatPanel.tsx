import { useEffect, useRef, useState } from "react";
import { SYSTEM_SENDER } from "@/net/session";
import { useT } from "@/i18n";
import { useSession } from "@/store/session";
import { cx } from "@/ui/cx";

/** Room chat, shared by the lobby and the game. */
export function ChatPanel({ className }: { className?: string }) {
  const t = useT();
  const { view, session } = useSession();
  const [text, setText] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const chat = view?.room.chat ?? [];

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    session?.chat(text);
    setText("");
  };

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      <ul ref={list} className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
        {chat.map((m, i) =>
          m.from === SYSTEM_SENDER ? (
            <li key={i} className="text-center text-xs italic text-text-muted">
              {t.dyn(`lobby.${m.text}`)}
            </li>
          ) : (
            <li key={i} className="break-words">
              <span className={cx("font-semibold", m.from === view?.me ? "text-accent" : "text-text-primary")}>{m.name}</span>
              <span className="text-text-secondary"> : {m.text}</span>
            </li>
          )
        )}
      </ul>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input className="input py-1.5" value={text} maxLength={300} placeholder={t("lobby.chatPlaceholder")} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-sm" disabled={!text.trim()}>
          {t("common.send")}
        </button>
      </form>
    </div>
  );
}
