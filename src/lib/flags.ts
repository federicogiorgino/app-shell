import * as SecureStore from "expo-secure-store";

import { config } from "./config";

/**
 * Tiny synchronous key/value helpers for small device-level settings (onboarding seen, theme).
 * Keys are namespaced with the app slug so a renamed template never collides with another app.
 */
const key = (name: string): string => `${config.slug}.${name}`;

export function readSetting(name: string): string | null {
  try {
    return SecureStore.getItem(key(name));
  } catch {
    return null;
  }
}

export function writeSetting(name: string, value: string): void {
  try {
    SecureStore.setItem(key(name), value);
  } catch {
    // Storage can be unavailable (for example on web); the setting just won't persist.
  }
}
