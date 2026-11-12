// Must stay first (react-native-gesture-handler requirement).
// eslint-disable-next-line import/no-duplicates
import "react-native-gesture-handler";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useEffect } from "react";
import type { JSX } from "react";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
// eslint-disable-next-line import/no-duplicates
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUniwind } from "uniwind";

import { ConfirmProvider } from "../components/confirm-provider";
import { GlassToastProvider } from "../lib/glass-toast";
import { DataError } from "../components/data-error";
import { ErrorScreen } from "../components/error-screen";
import { LaunchScreen } from "../components/launch-screen";
import { OfflineBanner } from "../components/offline-banner";
import "../lib/i18n";
import { applyStoredAccent } from "../lib/accent-preference";
import { AuthGateProvider, useAuthGate } from "../lib/auth-gate";
import { useLocalStore } from "../lib/db/use-local-store";
import { useNotificationRouting } from "../lib/notifications";
import { QueryProvider } from "../lib/query-provider";
import { applyStoredThemePreference } from "../lib/theme-preference";

import "../global.css";

// Apply the saved light/dark/system choice before the first render.
applyStoredThemePreference();
applyStoredAccent();

// Keep the splash screen up until the fonts, the local database and the stored session are ready.
void SplashScreen.preventAutoHideAsync();

/** Root error boundary: shown instead of a red screen when a screen throws while rendering. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps): JSX.Element {
  const { t } = useTranslation();

  // If the app crashed before the navigator mounted, the splash screen is still up.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // The local database could not be opened: the data-read error, with Try Again.
  if (error.name === "LocalStoreError") {
    return <DataError layout="screen" onRetry={() => void retry()} />;
  }

  return (
    <ErrorScreen
      title={t("errors.boundaryTitle")}
      message={__DEV__ ? error.message : t("errors.boundaryMessage")}
      actionLabel={t("common.tryAgain")}
      onAction={() => void retry()}
    />
  );
}

function RootStack(): JSX.Element {
  const { status, authEnabled, canEnterApp, hasOnboarded } = useAuthGate();
  const { theme } = useUniwind();
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  const accent = useThemeColor("accent");
  const border = useThemeColor("border");

  useNotificationRouting();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  // The fonts and the local database are ready: the launch screen takes over from the native
  // splash (same mark, same background) until the stored session has been read.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const base = theme === "dark" ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: accent,
      background,
      card: background,
      text: foreground,
      border,
    },
  };

  return (
    <>
      {/* While the stored session is read, the launch screen, not a flash of sign-in. */}
      {status === "loading" ? null : (
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: background },
            }}
          >
            <Stack.Protected guard={canEnterApp}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="item/[id]" />
              <Stack.Screen name="(settings)/theme" />
              <Stack.Screen name="(settings)/accent" />
              <Stack.Screen name="(settings)/language" />
            </Stack.Protected>
            {/* Account screens exist only when sign-in is on (EXPO_PUBLIC_AUTH_ENABLED=1). */}
            <Stack.Protected guard={canEnterApp && authEnabled}>
              <Stack.Screen name="(settings)/account" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="delete-account" />
            </Stack.Protected>
            <Stack.Protected guard={!canEnterApp && !hasOnboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={authEnabled && !canEnterApp && hasOnboarded}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
          <OfflineBanner />
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      )}
      {status === "loading" ? <LaunchScreen /> : null}
    </>
  );
}

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const storeReady = useLocalStore();

  // A font failure falls back to the system font instead of blocking the app.
  if ((!fontsLoaded && !fontError) || !storeReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        {/* The app's one toast, drawn in place over every screen; the tabs add their own
            above the tab bar. */}
        <GlassToastProvider>
          <QueryProvider>
            <AuthGateProvider>
              <ConfirmProvider>
                <RootStack />
              </ConfirmProvider>
            </AuthGateProvider>
          </QueryProvider>
        </GlassToastProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
