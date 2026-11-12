import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";

import { readSetting, writeSetting } from "./flags";

/**
 * Reduce Transparency: glass falls back to an opaque tint. It is on when
 * the system setting is on (iOS) or the device-only in-app setting is on. Android
 * has no system setting to read, so there only the in-app setting counts.
 */
const SETTING = "reduceTransparency";

let preference = readSetting(SETTING) === "1";
let system = false;
let systemWatched = false;
const listeners = new Set<() => void>();

const emit = (): void => listeners.forEach((listener) => listener());

function watchSystem(): void {
  if (systemWatched || Platform.OS !== "ios") return;
  systemWatched = true;
  void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
    system = enabled;
    emit();
  });
  AccessibilityInfo.addEventListener("reduceTransparencyChanged", (enabled) => {
    system = enabled;
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  watchSystem();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Persists the in-app setting and applies it immediately. */
export function setReduceTransparencyPreference(on: boolean): void {
  preference = on;
  writeSetting(SETTING, on ? "1" : "0");
  emit();
}

/** The in-app setting alone (for its switch in Settings). */
export function useReduceTransparencyPreference(): boolean {
  return useSyncExternalStore(subscribe, () => preference);
}

/** True when glass must use its opaque fallback. */
export function useReduceTransparency(): boolean {
  return useSyncExternalStore(subscribe, () => preference || system);
}
