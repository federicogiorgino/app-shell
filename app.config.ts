import type { ExpoConfig } from "expo/config";

import identity from "./app.identity.json";

/**
 * Single place that defines the app. Branding comes from `app.identity.json`
 * (rewritten by `bun run init`); everything else is shared template config.
 *
 * `APP_ENV` (`development`, `staging` or `production`, set by the EAS profiles) installs the
 * non-production builds next to the production app by suffixing the package/bundle id. The URL scheme stays the same so
 * the API's TRUSTED_ORIGINS needs a single entry.
 */
const APP_ENVS = ["development", "staging", "production"] as const;
type AppEnv = (typeof APP_ENVS)[number];

const requestedEnv = process.env.APP_ENV;
const appEnv: AppEnv = APP_ENVS.find((value) => value === requestedEnv) ?? "production";

// Dev and staging builds install next to the production app.
const idSuffix = { development: ".dev", staging: ".staging", production: "" }[appEnv];
const nameSuffix = { development: " (Dev)", staging: " (Staging)", production: "" }[appEnv];

const config: ExpoConfig = {
  name: `${identity.name}${nameSuffix}`,
  slug: identity.slug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: identity.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: `${identity.iosBundleIdentifier}${idSuffix}`,
  },
  android: {
    package: `${identity.androidPackage}${idSuffix}`,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#4b5bd8",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        // The launch screen (src/components/launch-screen.tsx) shows the same mark at the same size.
        image: "./assets/images/splash-icon.png",
        imageWidth: 92,
        resizeMode: "contain",
        backgroundColor: "#f2f2f7",
        dark: { image: "./assets/images/splash-icon-dark.png", backgroundColor: "#000000" },
      },
    ],
    "expo-status-bar",
    "expo-secure-store",
    "expo-sqlite",
    "expo-web-browser",
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: { asyncRoutes: { web: true } },
    appEnv,
    // Empty for a fresh template: run `bunx eas-cli init` to create and link an EAS project.
    ...(identity.easProjectId ? { eas: { projectId: identity.easProjectId } } : {}),
  },
};

export default config;
