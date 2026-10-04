import { useCallback } from "react";
import { useProfile, type Language } from "@/store/profile";
import en from "./en";
import fr, { type Dictionary } from "./fr";

export const LANGUAGES: Record<Language, { label: string; dictionary: Dictionary }> = {
  fr: { label: "Français", dictionary: fr },
  en: { label: "English", dictionary: en },
};

/** Every dotted path to a string in the dictionary (`"home.create"`, `"race.elves.name"`, ...). */
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : T[K] extends readonly string[] ? never : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = Paths<Dictionary>;
export type Params = Record<string, string | number>;

function lookup(dictionary: Dictionary, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary);
}

const fill = (text: string, params?: Params) =>
  params ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : text;

/** Translates outside React (falls back to French, then to the key itself). */
export function translate(language: Language, key: TranslationKey | string, params?: Params): string {
  const value = lookup(LANGUAGES[language].dictionary, key) ?? lookup(fr, key);
  return typeof value === "string" ? fill(value, params) : key;
}

/** Lists (e.g. rule steps) are not strings: read them with this. */
export function translateList(language: Language, key: string): readonly string[] {
  const value = lookup(LANGUAGES[language].dictionary, key);
  return Array.isArray(value) ? value : [];
}

export interface Translator {
  (key: TranslationKey, params?: Params): string;
  /** For keys built at runtime (`race.${id}.name`). */
  dyn: (key: string, params?: Params) => string;
  list: (key: string) => readonly string[];
  language: Language;
}

/** `const t = useT(); t("home.create")` — re-renders when the language changes. */
export function useT(): Translator {
  const language = useProfile((s) => s.language);
  const t = useCallback((key: TranslationKey, params?: Params) => translate(language, key, params), [language]);
  return Object.assign(t, {
    dyn: (key: string, params?: Params) => translate(language, key, params),
    list: (key: string) => translateList(language, key),
    language,
  });
}
