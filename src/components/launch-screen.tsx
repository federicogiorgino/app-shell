import { Spinner } from "heroui-native";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";
import Animated, { FadeOut, useReducedMotion } from "react-native-reanimated";
import { useUniwind } from "uniwind";

import { config } from "../lib/config";

// The native splash's own images (app.config.ts), so the hand-over shows no jump.
const MARK = {
  light: require("../../assets/images/splash-icon.png") as number,
  dark: require("../../assets/images/splash-icon-dark.png") as number,
};

/**
 * The launch screen: the app mark, the name, "Loading" and a spinner. It takes over from the native splash, which shows the same mark at the same
 * size, while the stored session is read, then fades out over the app (no fade with Reduce Motion).
 */
export function LaunchScreen(): JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      exiting={reduceMotion ? undefined : FadeOut.duration(400)}
      className="absolute inset-0 items-center justify-center bg-background"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("launch.loading")}
      accessibilityState={{ busy: true }}
    >
      {/* Centred like the native splash's image; the text hangs below it. */}
      <Image source={theme === "dark" ? MARK.dark : MARK.light} className="size-23" />
      <View className="absolute top-1/2 mt-15 items-center gap-3.5 px-8">
        <Text className="text-3xl font-bold tracking-tight text-foreground">{config.appName}</Text>
        <Text className="text-secondary text-muted">{t("launch.loading")}</Text>
        <Spinner className="mt-2" />
      </View>
    </Animated.View>
  );
}
