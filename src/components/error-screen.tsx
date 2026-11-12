import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, JSX } from "react";
import { Pressable, Text, View } from "react-native";
import { useResolveClassNames } from "uniwind";

/** How long the button reads "Trying…" after a press, so a quick retry is still visible. */
const BUSY_MS = 800;

interface ErrorScreenProps {
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
  /** Shown in a warning-tinted tile above the title. */
  icon?: ComponentProps<typeof Ionicons>["name"];
  /** The button's label for a moment after a press ("Trying…"). */
  busyLabel?: string;
  /** `screen` fills the screen; `inline` sits in a screen's content, below its header. */
  layout?: "screen" | "inline";
}

/**
 * Error state built from plain React Native primitives and theme classes, so it still renders
 * when the error happened above the HeroUI provider (root error boundary).
 */
export function ErrorScreen({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  busyLabel,
  layout = "screen",
}: ErrorScreenProps): JSX.Element {
  const iconColor = useResolveClassNames("text-warning").color;
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function press(): void {
    if (busy) return;
    if (busyLabel) {
      setBusy(true);
      timer.current = setTimeout(() => setBusy(false), BUSY_MS);
    }
    onAction();
  }

  return (
    <View
      className={
        layout === "screen"
          ? "flex-1 items-center justify-center gap-3 bg-background px-10"
          : "items-center gap-3 px-6 pt-16 pb-12"
      }
    >
      {icon ? (
        <View
          className="mb-2 size-21 items-center justify-center rounded-4xl bg-warning-soft"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Ionicons
            name={icon}
            size={40}
            color={typeof iconColor === "string" ? iconColor : undefined}
          />
        </View>
      ) : null}
      <Text accessibilityRole="header" className="text-center text-title font-bold text-foreground">
        {title}
      </Text>
      {message ? <Text className="text-center text-secondary text-muted">{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        onPress={press}
        className="mt-3.5 min-h-12 items-center justify-center rounded-full bg-accent px-6 active:opacity-80"
      >
        <Text className="text-body font-semibold text-accent-foreground">
          {busy && busyLabel ? busyLabel : actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
