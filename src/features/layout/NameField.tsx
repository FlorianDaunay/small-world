import { useT } from "@/i18n";
import { useProfile } from "@/store/profile";
import { Field, TextInput } from "@/ui/Field";

/** The player's display name, saved in the profile. */
export function NameField({ showError }: { showError?: boolean }) {
  const t = useT();
  const { name, setName } = useProfile();
  return (
    <Field label={t("home.playerName")} error={showError && !name.trim() ? t("home.nameRequired") : undefined}>
      {(id) => <TextInput id={id} value={name} maxLength={24} placeholder={t("home.namePlaceholder")} onChange={(e) => setName(e.target.value)} />}
    </Field>
  );
}
