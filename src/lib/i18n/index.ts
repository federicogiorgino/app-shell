import { getLocales } from "expo-localization";
import i18n, { changeLanguage } from "i18next";
import { useSyncExternalStore } from "react";
import { initReactI18next } from "react-i18next";

import { readSetting, writeSetting } from "../flags";
import { en, type Translation } from "./en";
import { it } from "./it";

/** Languages the app ships. `label` is shown in its own language, so it is not translated. */
export const LANGUAGES = {
  en: { label: "English" },
  it: { label: "Italiano" },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

/** `system` follows the device language. */
export type LanguagePreference = "system" | LanguageCode;

const SETTING = "language";
const FALLBACK: LanguageCode = "en";

function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return value != null && value in LANGUAGES;
}

function deviceLanguage(): LanguageCode {
  const code = getLocales()[0]?.languageCode;
  return isLanguageCode(code) ? code : FALLBACK;
}

function resolve(value: LanguagePreference): LanguageCode {
  return value === "system" ? deviceLanguage() : value;
}

let preference: LanguagePreference = (() => {
  const stored = readSetting(SETTING);
  return isLanguageCode(stored) ? stored : "system";
})();

const listeners = new Set<() => void>();

// Types for `t("some.key")`: keys are checked against the English file.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Translation };
  }
}

// `use` is also a named export, which the import plugin flags; the default instance is intended.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, it: { translation: it } },
  lng: resolve(preference),
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false },
  // Resources are bundled, so initialize synchronously: no flash of untranslated text.
  initAsync: false,
  react: { useSuspense: false },
});

/** Persists the choice and switches the language immediately. */
export function setLanguagePreference(value: LanguagePreference): void {
  preference = value;
  writeSetting(SETTING, value);
  void changeLanguage(resolve(value));
  listeners.forEach((listener) => listener());
}

/** The saved choice (`system` or a language); re-renders when it changes. */
export function useLanguagePreference(): LanguagePreference {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => preference
  );
}

export { i18n };
