import AsyncStorage from "@react-native-async-storage/async-storage";

import { config } from "./config";

/**
 * Async key/value storage for non-secret data such as the query cache. Keys are namespaced with
 * the app slug. Use `flags.ts` (SecureStore) for tiny synchronous device settings and
 * `auth-client.ts` for session tokens; never put secrets here, it is not encrypted.
 */
const key = (name: string): string => `${config.slug}.${name}`;

export async function readJSON<T>(name: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(name));
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function writeJSON(name: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    // Storage can be full or unavailable; the value just won't persist.
  }
}

export async function removeItem(name: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(name));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Namespaced key, for libraries that take a storage object and a key (the query persister). */
export const storageKey = key;
