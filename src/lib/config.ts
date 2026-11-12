import Constants from "expo-constants";

import { env } from "./env";

/**
 * Runtime app config, read from the Expo config (see `app.config.ts`) so nothing about the
 * app's identity is hardcoded in screens or libraries. Build-time variables live in `env.ts`.
 */
const expoConfig = Constants.expoConfig;
const scheme = Array.isArray(expoConfig?.scheme) ? expoConfig.scheme[0] : expoConfig?.scheme;

if (!scheme) {
  throw new Error("The Expo config has no `scheme`. Set it in app.identity.json.");
}

export const config = {
  appName: expoConfig?.name ?? "App",
  slug: expoConfig?.slug ?? "app",
  version: expoConfig?.version ?? "0.0.0",
  scheme,
  appEnv: env.appEnv,
  /** Base URL of the API, without a trailing slash; null when the app has no backend. */
  apiUrl: env.apiUrl,
  /** Sign-in is required; set `EXPO_PUBLIC_AUTH_ENABLED=1` (see docs/auth-and-navigation.md). */
  authEnabled: env.authEnabled,
} as const;
