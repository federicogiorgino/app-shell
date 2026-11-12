import { useSyncExternalStore } from "react";
import { Uniwind } from "uniwind";

import { readSetting, writeSetting } from "./flags";

/**
 * Accent presets, one value per theme so dark mode gets a lighter shade of the same hue.
 * Red, green and amber are left out on purpose: they carry meaning in the design system
 * (danger, success, warning). `indigo` is the default and matches `src/global.css`.
 * `foreground` is the text/icon colour used on top of the accent. Values are hex because
 * React Native style props do not understand `oklch()`.
 */
export const ACCENTS = {
  indigo: {
    light: { accent: "#4B5BD8", foreground: "#FFFFFF" },
    dark: { accent: "#8C9BFF", foreground: "#10132B" },
  },
  blue: {
    light: { accent: "#0485F7", foreground: "#FCFCFC" },
    dark: { accent: "#4DA6FF", foreground: "#0A1A2B" },
  },
  violet: {
    light: { accent: "#8C52FF", foreground: "#FCFCFC" },
    dark: { accent: "#B08CFF", foreground: "#1C1033" },
  },
  pink: {
    light: { accent: "#ED3593", foreground: "#FCFCFC" },
    dark: { accent: "#FF6EB4", foreground: "#2B0A1A" },
  },
  teal: {
    light: { accent: "#00B5B5", foreground: "#18181B" },
    dark: { accent: "#3FD1D1", foreground: "#062424" },
  },
} as const;

export type AccentId = keyof typeof ACCENTS;

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

/** The preset `src/global.css` already sets, so it needs no runtime override. */
export const DEFAULT_ACCENT: AccentId = "indigo";

const SETTING = "accent";
const THEMES = ["light", "dark"] as const;

function isAccentId(value: string | null): value is AccentId {
  return value != null && value in ACCENTS;
}

/** The accent colour of a preset in the given theme, for swatches. */
export function accentSwatch(id: AccentId, theme: string): string {
  return ACCENTS[id][theme === "dark" ? "dark" : "light"].accent;
}

let current: AccentId = (() => {
  const stored = readSetting(SETTING);
  return isAccentId(stored) ? stored : DEFAULT_ACCENT;
})();

const listeners = new Set<() => void>();

function applyAccent(id: AccentId): void {
  for (const theme of THEMES) {
    const { accent, foreground } = ACCENTS[id][theme];
    // `--focus` and the hover/soft shades are derived from these two, so they follow.
    Uniwind.updateCSSVariables(theme, { "--accent": accent, "--accent-foreground": foreground });
  }
}

/** Persists the choice and applies it immediately. */
export function setAccentPreference(id: AccentId): void {
  current = id;
  writeSetting(SETTING, id);
  applyAccent(id);
  listeners.forEach((listener) => listener());
}

/** Call once at startup, before the first render, so the saved accent is used from frame one. */
export function applyStoredAccent(): void {
  if (current !== DEFAULT_ACCENT) applyAccent(current);
}

/** The selected accent; re-renders the component when it changes. */
export function useAccentPreference(): AccentId {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current
  );
}
