import { Ionicons } from "@expo/vector-icons";
import { Button, Typography, useThemeColor } from "heroui-native";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/glass-surface";
import { tabBarTop, useGlassTabBarInset } from "@/components/glass-tabs";

/** The toast: a 54 pt glass pill, shown for about 4 s. */
const TOAST_HEIGHT = 54;
const TOAST_DURATION_MS = 4000;
const GAP_ABOVE_BOTTOM = 8;
const SIDE_INSET = 18;

export type ToastTone = "default" | "success" | "warning" | "danger";

export interface GlassToastOptions {
  /** What just happened, e.g. "Item deleted". */
  label: string;
  /** A second, muted line. */
  description?: string;
  /** Adds a status icon; the colour keeps its meaning (success, warning, danger). */
  tone?: ToastTone;
  /** Reverts the change. Runs at most once; the toast closes. Without it there is no button. */
  onUndo?: () => void;
  /**
   * Shown by a pushed screen that is going back to the tabs (Delete on the detail screen): the
   * toast sits above the tab bar, where the user is about to be.
   */
  aboveTabBar?: boolean;
}

type ShowGlassToast = (options: GlassToastOptions) => void;

const GlassToastContext = createContext<ShowGlassToast | null>(null);

interface ToastState extends GlassToastOptions {
  key: number;
}

const TONE_ICON = {
  success: "checkmark-circle",
  warning: "warning",
  danger: "alert-circle",
} as const satisfies Record<Exclude<ToastTone, "default">, ComponentProps<typeof Ionicons>["name"]>;

/**
 * The app's one toast: a glass pill drawn in place, not in a portal, so its glass looks like
 * the tab bar's. The root layout hosts one for every screen; the tabs layout hosts
 * another with the tabs' `blurTarget`, which sits above the tab bar and wins inside the tabs.
 * Show it with `useGlassToast`, or `useNotify` for plain outcomes.
 */
export function GlassToastProvider({
  blurTarget,
  children,
}: {
  /** Android: the `BlurTargetView` of the screens, as for the tab bar. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const tabBarInset = useGlassTabBarInset();
  const baseBottom = tabBarInset > 0 ? tabBarInset : insets.bottom;
  const [success, warning, danger] = useThemeColor(["success", "warning", "danger"]);
  const toneColor = { success, warning, danger };
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextKey = useRef(0);

  const show = useCallback<ShowGlassToast>((options) => {
    nextKey.current += 1;
    setToast({ ...options, key: nextKey.current });
    AccessibilityInfo.announceForAccessibility(
      options.description ? `${options.label}. ${options.description}` : options.label
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const tone = toast?.tone && toast.tone !== "default" ? toast.tone : null;

  return (
    <GlassToastContext value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.key}
          entering={reduceMotion ? undefined : FadeInDown.springify()}
          exiting={reduceMotion ? undefined : FadeOutDown.duration(260)}
          pointerEvents="box-none"
          style={[
            styles.host,
            {
              bottom:
                (toast.aboveTabBar ? tabBarTop(insets.bottom) : baseBottom) + GAP_ABOVE_BOTTOM,
            },
          ]}
        >
          <View accessibilityLiveRegion="polite" style={styles.pill}>
            <GlassSurface radius={TOAST_HEIGHT / 2} blurTarget={blurTarget} />
            {tone ? <Ionicons name={TONE_ICON[tone]} size={20} color={toneColor[tone]} /> : null}
            <View className="flex-1">
              <Typography className="text-body font-medium" numberOfLines={1}>
                {toast.label}
              </Typography>
              {toast.description ? (
                <Typography className="text-secondary text-muted" numberOfLines={2}>
                  {toast.description}
                </Typography>
              ) : null}
            </View>
            {toast.onUndo ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setToast(null);
                  toast.onUndo?.();
                }}
              >
                <Button.Label className="font-bold text-accent">{t("common.undo")}</Button.Label>
              </Button>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </GlassToastContext>
  );
}

/** Shows the glass toast. Works on every screen (the root layout hosts one). */
export function useGlassToast(): ShowGlassToast {
  const show = use(GlassToastContext);
  if (!show) throw new Error("useGlassToast must be used inside GlassToastProvider");
  return show;
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: SIDE_INSET, right: SIDE_INSET },
  pill: {
    minHeight: TOAST_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 20,
    paddingRight: 8,
  },
});
