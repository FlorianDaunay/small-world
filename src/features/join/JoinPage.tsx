import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "@/features/layout/Header";
import { NameField } from "@/features/layout/NameField";
import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { useSession } from "@/store/session";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";

/** Join form; `#/join?code=XXXXXX` (invite links) pre-fills the code. */
export function JoinPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = useProfile((s) => s.name);
  const { join, busy, error, clearError } = useSession();
  useEffect(() => clearError(), [clearError]);
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || code.trim().length < 4) return;
    if (await join(code, password)) navigate("/room");
  };

  return (
    <Page>
      <form onSubmit={submit} className="card mx-auto max-w-md space-y-5 p-6">
        <h1 className="text-2xl font-bold">{t("join.title")}</h1>
        <NameField showError={submitted} />
        <Field label={t("join.code")}>
          {(id) => (
            <TextInput
              id={id}
              value={code}
              maxLength={8}
              autoFocus={!code}
              placeholder={t("join.codePlaceholder")}
              className="font-mono text-lg uppercase tracking-[0.3em]"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
          )}
        </Field>
        <Field label={t("join.password")}>
          {(id) => <TextInput id={id} type="password" autoFocus={!!code} value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <p className="text-sm text-danger">{t.dyn(`errors.${error}`)}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? t("join.connecting") : t("join.submit")}
        </Button>
      </form>
    </Page>
  );
}
