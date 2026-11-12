import { Uniwind } from "uniwind";

import { readSetting, writeSetting } from "./flags";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

const SETTING = "theme";

export function getThemePreference(): ThemePreference {
  const stored = readSetting(SETTING);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** Persists the choice and applies it immediately. */
export function setThemePreference(preference: ThemePreference): void {
  writeSetting(SETTING, preference);
  Uniwind.setTheme(preference);
}

/** Call once at startup, before the first render, so the saved theme is used from frame one. */
export function applyStoredThemePreference(): void {
  Uniwind.setTheme(getThemePreference());
}
