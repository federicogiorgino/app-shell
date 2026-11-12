import { Ionicons } from "@expo/vector-icons";
import { Button, Typography, useThemeColor } from "heroui-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ComponentProps, JSX, Ref } from "react";
import {
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { config } from "../lib/config";
import { useAuthGate } from "../lib/auth-gate";

/** Instance type of the ScrollView ref (not exported by React Native 0.88). */
type ScrollViewHandle =
  ComponentProps<typeof ScrollView> extends { ref?: Ref<infer Handle> } ? Handle : never;

/** The three onboarding slides (keys in `src/lib/i18n`). */
const SLIDES = [
  {
    icon: "sparkles-outline",
    title: "onboarding.welcomeTitle",
    description: "onboarding.welcomeDescription",
  },
  {
    icon: "cloud-offline-outline",
    title: "onboarding.offlineTitle",
    description: "onboarding.offlineDescription",
  },
  {
    icon: "color-palette-outline",
    title: "onboarding.yoursTitle",
    description: "onboarding.yoursDescription",
  },
] as const satisfies readonly {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
}[];

export default function OnboardingScreen(): JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useAuthGate();
  const accent = useThemeColor("accent");
  const scrollRef = useRef<ScrollViewHandle>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  function next(): void {
    if (isLast) {
      completeOnboarding();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <View className="min-h-11 flex-row justify-end px-4 pt-2">
        {isLast ? null : (
          <Button variant="ghost" size="sm" onPress={completeOnboarding}>
            <Button.Label>{t("common.skip")}</Button.Label>
          </Button>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View
            key={slide.title}
            className="items-center justify-center gap-4 px-10"
            style={{ width }}
          >
            <View className="size-24 items-center justify-center rounded-full bg-accent-soft">
              <Ionicons name={slide.icon} size={44} color={accent} />
            </View>
            <Typography.Heading type="h2" className="text-center">
              {t(slide.title, { name: config.appName })}
            </Typography.Heading>
            <Typography.Paragraph color="muted" className="text-center">
              {t(slide.description)}
            </Typography.Paragraph>
          </View>
        ))}
      </ScrollView>

      <View className="gap-6 px-6">
        <View
          className="flex-row justify-center gap-2"
          accessibilityLabel={t("onboarding.page", { current: index + 1, total: SLIDES.length })}
        >
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide.title}
              className={
                dotIndex === index
                  ? "h-2 w-6 rounded-full bg-accent"
                  : "size-2 rounded-full bg-default"
              }
            />
          ))}
        </View>
        <Button onPress={next}>
          <Button.Label>{isLast ? t("common.getStarted") : t("common.next")}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
