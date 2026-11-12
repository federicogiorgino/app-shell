import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useThemeColor } from "heroui-native";
import {
  createContext,
  Fragment,
  use,
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ComponentRef,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/glass-surface";
import type { RowRect } from "@/components/swipeable-row";
import { useGlassPalette } from "@/lib/glass";
import { MENU_ITEM_HEIGHT, RADIUS } from "@/lib/metrics";
import { useReduceTransparency } from "@/lib/reduce-transparency";

/** 256 wide, 6 pt padding, 44 pt items; corners on the radius scale. */
const MENU_WIDTH = 256;
const MENU_RADIUS = RADIUS["3xl"];
const MENU_PADDING = 6;
const ITEM_HEIGHT = MENU_ITEM_HEIGHT;
const SEPARATOR_GAP = 6;
const GAP_TO_ROW = 8;
/** A short plain fade: a spring zoom read as too strong on device. */
const MENU_FADE_MS = 180;
/** expo-blur intensity of the scrim behind the lifted row. */
const SCRIM_BLUR = 18;

export interface ContextMenuItem {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Drawn in danger colour, after a separator. */
  destructive?: boolean;
  onPress: () => void;
}

export interface ContextMenuState {
  /** Where the pressed row is on screen (`SwipeableRow`'s `onLongPress` gives it). */
  rect: RowRect;
  /** The row drawn again, lifted above the scrim at the same place. */
  preview: ReactNode;
  items: readonly ContextMenuItem[];
  /** Accessibility label of the menu, such as "Actions for Groceries". */
  label: string;
}

const ContextMenuContext = createContext<((state: ContextMenuState) => void) | null>(null);

/**
 * The long-press menu, like an iOS context menu: the row lifted above a blurred scrim, and a
 * glass menu of its commands. Drawn in place (mount the provider after the screens, as the tabs
 * layout does), not in a portal, so its glass looks like the tab bar's. HeroUI's `Menu` is the
 * portalled alternative anchored to a trigger, without the lifted row. Android back and a tap
 * on the scrim close it.
 */
export function ContextMenuProvider({
  blurTarget,
  children,
}: {
  /** Android: the screens' `BlurTargetView`, so the scrim blurs them. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  children: ReactNode;
}): JSX.Element {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const close = useCallback(() => setMenu(null), []);

  return (
    <ContextMenuContext value={setMenu}>
      {children}
      {menu ? <ContextMenu state={menu} onClose={close} blurTarget={blurTarget} /> : null}
    </ContextMenuContext>
  );
}

/** Opens the context menu for a row. Use inside `ContextMenuProvider`. */
export function useContextMenu(): (state: ContextMenuState) => void {
  const open = use(ContextMenuContext);
  if (!open) throw new Error("useContextMenu must be used inside ContextMenuProvider");
  return open;
}

function ContextMenu({
  state,
  onClose,
  blurTarget,
}: {
  state: ContextMenuState;
  onClose: () => void;
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
}): JSX.Element {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency();
  const glass = useGlassPalette();
  const [foreground, danger] = useThemeColor(["foreground", "danger"]);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { rect, items, preview, label } = state;

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  // Below the row when it fits, otherwise above it. When neither fits (a row low on a short
  // screen), the lifted row moves up so the menu fits below it, like an iOS context menu.
  const separators = items.some((item, index) => item.destructive && index > 0) ? 1 : 0;
  const menuHeight = items.length * ITEM_HEIGHT + MENU_PADDING * 2 + separators * SEPARATOR_GAP;
  const minTop = insets.top + 8;
  const maxBottom = window.height - insets.bottom - 16;
  let rowTop = rect.y;
  let top: number;
  if (rect.y + rect.height + GAP_TO_ROW + menuHeight <= maxBottom) {
    top = rect.y + rect.height + GAP_TO_ROW;
  } else if (rect.y - GAP_TO_ROW - menuHeight >= minTop) {
    top = rect.y - GAP_TO_ROW - menuHeight;
  } else {
    rowTop = Math.max(minTop, maxBottom - menuHeight - GAP_TO_ROW - rect.height);
    top = rowTop + rect.height + GAP_TO_ROW;
  }
  const left = Math.min(rect.x + 8, window.width - MENU_WIDTH - 14);

  const select = (item: ContextMenuItem): void => {
    onClose();
    item.onPress();
  };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(MENU_FADE_MS)}
        exiting={reduceMotion ? undefined : FadeOut.duration(150)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("menu.close")}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          {reduceTransparency || (Platform.OS === "android" && !blurTarget) ? null : (
            <BlurView
              tint={glass.colorScheme}
              intensity={SCRIM_BLUR}
              {...(blurTarget
                ? { blurTarget, blurMethod: "dimezisBlurViewSdk31Plus" as const }
                : null)}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.scrim }]} />
        </Pressable>
      </Animated.View>

      {/* The row, lifted above the scrim at the same place. */}
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(MENU_FADE_MS)}
        pointerEvents="none"
        className="overflow-hidden rounded-3xl bg-surface shadow-overlay"
        style={{ position: "absolute", top: rowTop, left: rect.x, width: rect.width }}
      >
        {preview}
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(MENU_FADE_MS)}
        exiting={reduceMotion ? undefined : FadeOut.duration(150)}
        accessibilityRole="menu"
        accessibilityLabel={label}
        style={{
          position: "absolute",
          top,
          left,
          width: MENU_WIDTH,
          padding: MENU_PADDING,
          borderRadius: MENU_RADIUS,
        }}
        className="shadow-overlay"
      >
        <GlassSurface radius={MENU_RADIUS} blurTarget={blurTarget} />
        {items.map((item, index) => (
          <Fragment key={item.key}>
            {item.destructive && index > 0 && !items[index - 1]?.destructive ? (
              <View
                className="mx-3.5 bg-separator"
                style={{ height: StyleSheet.hairlineWidth, marginVertical: SEPARATOR_GAP / 2 }}
              />
            ) : null}
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => select(item)}
              // Layout lives in the style function: with one, class styles were not applied.
              style={({ pressed }) => ({
                height: ITEM_HEIGHT,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                borderRadius: RADIUS["2xl"],
                backgroundColor: pressed ? glass.highlight : "transparent",
              })}
            >
              <Ionicons name={item.icon} size={19} color={item.destructive ? danger : foreground} />
              <Text className={`text-body ${item.destructive ? "text-danger" : "text-foreground"}`}>
                {item.label}
              </Text>
            </Pressable>
          </Fragment>
        ))}
      </Animated.View>
    </View>
  );
}
