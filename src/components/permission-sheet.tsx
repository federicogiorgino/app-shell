import { Ionicons } from "@expo/vector-icons";
import { Button, useThemeColor } from "heroui-native";
import type { ComponentProps, ComponentRef, JSX, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { GlassSheet } from "@/components/glass-sheet";

/**
 * Explains a permission before the system prompt, so the prompt has context. Allow should show
 * the system prompt; Not Now and closing leave the feature off. Defaults to notifications.
 */
export function PermissionSheet({
  isOpen,
  onAllow,
  onNotNow,
  icon = "notifications",
  title,
  message,
  blurTarget,
}: {
  isOpen: boolean;
  onAllow: () => void;
  onNotNow: () => void;
  icon?: ComponentProps<typeof Ionicons>["name"];
  title?: string;
  message?: string;
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
}): JSX.Element {
  const { t } = useTranslation();
  const accent = useThemeColor("accent");
  return (
    <GlassSheet
      blurTarget={blurTarget}
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onNotNow();
      }}
    >
      <View className="items-center gap-3 px-4 pb-2">
        <View className="size-18 items-center justify-center rounded-3xl bg-accent-soft">
          <Ionicons name={icon} size={34} color={accent} />
        </View>
        <Text accessibilityRole="header" className="text-title font-bold text-foreground">
          {title ?? t("permission.notificationsTitle")}
        </Text>
        <Text className="text-center text-secondary text-muted">
          {message ?? t("permission.notificationsMessage")}
        </Text>
      </View>
      <View className="gap-2">
        <Button size="lg" onPress={onAllow}>
          <Button.Label>{t("permission.allow")}</Button.Label>
        </Button>
        <Button size="lg" variant="ghost" onPress={onNotNow}>
          <Button.Label>{t("permission.notNow")}</Button.Label>
        </Button>
      </View>
    </GlassSheet>
  );
}
