import { Ionicons } from "@expo/vector-icons";
import { Button, Typography, useThemeColor } from "heroui-native";
import type { ComponentProps, JSX } from "react";
import { View } from "react-native";

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Centered icon, title and optional action, for empty lists and placeholder screens. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps): JSX.Element {
  const muted = useThemeColor("muted");

  return (
    <View className="items-center gap-3 px-6 py-12">
      <Ionicons name={icon} size={40} color={muted} />
      <Typography.Heading type="h4" className="text-center">
        {title}
      </Typography.Heading>
      {description ? (
        <Typography.Paragraph color="muted" className="text-center">
          {description}
        </Typography.Paragraph>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction}>
          <Button.Label>{actionLabel}</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
