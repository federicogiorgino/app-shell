// glass-tabs.tsx — single-file floating glass tab bar for Expo Router.
// Adapted from expo-glass-tabs by David Mokos (MIT License,
// https://github.com/davidmokos/expo-glass-tabs). Copyright (c) David Mokos.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software, subject to including this notice. Full MIT text applies.
//
// Change from the original: the stacked-BlurView "progressive blur" behind
// the bar is removed (it caused visible banding) and replaced with an
// optional single-gradient `edgeFade` prop. The glass material is the app's
// shared `GlassSurface` (with its Reduce Transparency fallback), so the theme
// only carries tints and the selection pill.

import * as Haptics from "expo-haptics";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import {
  Children,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "react-native-screens";
import type {
  TabListProps,
  TabsDescriptor,
  TabsSlotRenderOptions,
  TabTriggerSlotProps,
} from "expo-router/ui";

import { GlassSurface } from "@/components/glass-surface";

// ─── Minimize state ────────────────────────────────────────────────────────

/**
 * Spring, not timing: scroll direction flips mid-animation constantly, and a
 * spring retargets while preserving velocity — a timing curve would restart
 * from zero and feel mechanical. Critically damped (ratio 1): no overshoot
 * and no long settling tail, which matters because the bar animates layout.
 */
const MINIMIZE_SPRING = { duration: 380, dampingRatio: 1 };

export type MinimizeState = {
  /** 0 = expanded (icons + labels), 1 = minimized (icons only). */
  progress: SharedValue<number>;
  /** Last requested target — lets writers avoid restarting the spring. */
  target: SharedValue<number>;
};

const MinimizeContext = createContext<MinimizeState | null>(null);

export function TabBarMinimizeProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  const target = useSharedValue(0);
  const state = useMemo(() => ({ progress, target }), [progress, target]);
  return <MinimizeContext.Provider value={state}>{children}</MinimizeContext.Provider>;
}

/** Minimize state for the bar itself, which always lives inside the provider. */
function useMinimizeState(): MinimizeState {
  const state = use(MinimizeContext);
  if (!state) {
    throw new Error("GlassTabBar must be rendered inside TabBarMinimizeProvider.");
  }
  return state;
}

/**
 * Retarget the minimize spring — no-op when already heading to `next`, so
 * per-frame scroll events never restart (and visibly stutter) the animation.
 * Callable from both threads.
 */
function setMinimized(state: MinimizeState, next: 0 | 1) {
  "worklet";
  if (state.target.get() !== next) {
    state.target.set(next);
    state.progress.set(withSpring(next, MINIMIZE_SPRING));
  }
}

/**
 * Scroll handler for Animated.ScrollView. Scrolling down minimizes the tab
 * bar, scrolling up (or being near the top) expands it. Offsets are clamped
 * to the scrollable range so rubber-band overscroll can't flip the direction
 * for a frame and flicker the bar. A no-op outside the glass tabs (e.g. stack
 * screens pushed over them), so any screen can attach it.
 */
export function useMinimizeOnScroll() {
  const state = use(MinimizeContext);
  const previousY = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!state) {
        return;
      }
      const maxY = Math.max(event.contentSize.height - event.layoutMeasurement.height, 0);
      const y = Math.min(Math.max(event.contentOffset.y, 0), maxY);
      const dy = y - previousY.get();
      previousY.set(y);

      if (y < 24) {
        setMinimized(state, 0);
      } else if (dy > 3) {
        setMinimized(state, 1);
      } else if (dy < -3) {
        setMinimized(state, 0);
      }
    },
  });
}

// ─── Tab bar ───────────────────────────────────────────────────────────────

/** Larger Text: tab labels grow at most this much (the bar has a fixed height). */
const TAB_LABEL_MAX_FONT_MULTIPLIER = 1.2;
const EXPANDED_HEIGHT = 58;
const MINIMIZED_HEIGHT = 44;
/** Extra horizontal inset applied to the pill when minimized (per side). */
const MINIMIZED_INSET = 34;
/** Outer margin between the pill and the screen edges (per side). */
const BAR_MARGIN = 12;
/** Inner inset between the capsule wall and the tab items. */
const ROW_PAD_H = 4;
const LABEL_HEIGHT = 13;
const ICON_SIZE = 21;
/** Space between icon and label — folded into the label's animated height so
 * it fully disappears when minimized (keeps the icon perfectly centered). */
const ITEM_GAP = 2;
const LABEL_BLOCK = LABEL_HEIGHT + ITEM_GAP;
const ITEM_PAD_V = 7; // was 7
// /** Highlight content heights — radius must track h/2 for a true capsule. */
const HIGHLIGHT_EXPANDED = ICON_SIZE + LABEL_BLOCK + ITEM_PAD_V * 2;
const HIGHLIGHT_MINIMIZED = ICON_SIZE + ITEM_PAD_V * 2;
/** How far the optional edge fade rises above the pill. */
const FADE_BLEED = 44;
/** Space between the pill and the action circle. */
const ACTION_GAP = 10;
const ACTION_ICON_SIZE = 24;

/** Bar height for a minimize progress; the action circle uses it as its diameter. */
function getBarHeight(progress: number) {
  "worklet";
  return interpolate(progress, [0, 1], [EXPANDED_HEIGHT, MINIMIZED_HEIGHT], Extrapolation.CLAMP);
}

/** Extra inset per side while minimized: the whole row shrinks toward the center. */
function getSideInset(progress: number) {
  "worklet";
  return interpolate(progress, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
}

/** Pill width for a minimize progress, leaving room for the action circle. */
function getPillWidth(progress: number, windowWidth: number, hasAction: boolean) {
  "worklet";
  const actionSpace = hasAction ? getBarHeight(progress) + ACTION_GAP : 0;
  return windowWidth - BAR_MARGIN * 2 - getSideInset(progress) * 2 - actionSpace;
}

/**
 * Slide spring: interruptible by design — rapid tab-hopping retargets with
 * preserved velocity. Slight under-damping gives the pill a tiny settle,
 * safe here because it's transform-only (no layout involved).
 */
const SLIDE_SPRING = { duration: 420, dampingRatio: 0.82 };

export type GlassTabBarTheme = {
  activeTint: string;
  inactiveTint: string;
  /** Sliding highlight pill color. */
  highlight: string;
};

const DEFAULT_THEME: GlassTabBarTheme = {
  activeTint: "#FFFFFF",
  inactiveTint: "#9E9EA6",
  highlight: "rgba(255,255,255,0.14)",
};

export type GlassTabItem = {
  name: string;
  label: string;
  /** SF Symbol name (preferred). */
  icon?: SymbolViewProps["name"];
  /** Custom glyph (e.g. a tinted logo image); called once per tint layer. */
  renderIcon?: (props: { tint: string; size: number }) => ReactNode;
};

type BarContextValue = {
  slideIndex: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  theme: GlassTabBarTheme;
};

const BarContext = createContext<BarContextValue | null>(null);

export type GlassTabBarProps = TabListProps & {
  /** Called when a tab is chosen by tap or scrub release. */
  onIndexSelected?: (index: number) => void;
  theme?: Partial<GlassTabBarTheme>;
  /** Haptic tick while the scrub crosses tab boundaries (iOS). */
  haptics?: boolean;
  /**
   * Optional solid color to fade the screen's bottom edge into behind the
   * pill (e.g. your background color). One smooth gradient, no stacked blur
   * layers, so no banding. Omit for nothing behind the bar.
   */
  edgeFade?: string;
  /**
   * Android only: a `BlurTargetView` wrapping the screens. Without it Android
   * has no real blur and shows the translucent wash alone.
   */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  /** A round glass button beside the pill for the screen's main action (not a tab). */
  action?: GlassTabAction;
};

export type GlassTabAction = {
  label: string;
  renderIcon: (props: { tint: string; size: number }) => ReactNode;
  onPress: () => void;
  /** A solid color for the button (e.g. the accent) instead of neutral glass. */
  fill?: string;
  /** Icon tint on `fill`; defaults to the active tab tint. */
  tint?: string;
};

/** Round glass button beside the pill; shrinks with the bar. */
function GlassActionButton({
  action,
  theme,
  blurTarget,
  progress,
  shapeStyle,
}: {
  action: GlassTabAction;
  theme: GlassTabBarTheme;
  blurTarget: GlassTabBarProps["blurTarget"];
  progress: SharedValue<number>;
  shapeStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  const sizeStyle = useAnimatedStyle(() => {
    const size = getBarHeight(progress.get());
    return { width: size, height: size };
  });

  return (
    <Animated.View style={sizeStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={action.onPress}
        style={({ pressed }) => ({
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <GlassSurface fill={action.fill} blurTarget={blurTarget} shapeStyle={shapeStyle} />
        {action.renderIcon({ tint: action.tint ?? theme.activeTint, size: ACTION_ICON_SIZE })}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Floating liquid-glass tab bar with Revolut-style minimize-on-scroll,
 * a sliding highlight, and finger scrubbing. Use via `TabList asChild`
 * with expo-router's headless tabs.
 */
export function GlassTabBar({
  children,
  onIndexSelected,
  theme: themeOverrides,
  haptics = true,
  edgeFade,
  blurTarget,
  action,
  ...props
}: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const minimized = useMinimizeState();
  const progress = minimized.progress;
  const slideIndex = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastTicked = useSharedValue(-1);
  const tabCount = Math.max(Children.count(children), 1);
  const hasAction = action != null;
  const theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

  // Picker-style tick while the highlight crosses tab boundaries mid-drag.
  const tick = useCallback(() => {
    if (haptics && Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
  }, [haptics]);

  // Navigation happens only on release — switching screens live while
  // scrubbing makes the content jump under the finger.
  const selectIndex = useCallback((index: number) => onIndexSelected?.(index), [onIndexSelected]);

  // Scrubbing: the highlight tracks the finger 1:1 while dragging (no spring
  // — it must feel attached), haptic ticks fire on boundary crossings, and
  // navigation happens only on release. Taps are handled by a Tap gesture
  // racing the pan — the detector consumes the bar's touches, so the inner
  // Pressables never receive them.
  const gesture = useMemo(() => {
    const indexAtX = (x: number, minimizedValue: number) => {
      "worklet";
      const barWidth = getPillWidth(minimizedValue, windowWidth, hasAction);
      const itemWidth = (barWidth - ROW_PAD_H * 2) / tabCount;
      const raw = (x - ROW_PAD_H) / itemWidth - 0.5;
      return Math.min(Math.max(raw, 0), tabCount - 1);
    };

    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-14, 14])
      .onStart(() => {
        isDragging.set(true);
        lastTicked.set(Math.round(slideIndex.get()));
        // Scrubbing is a deliberate bar interaction — surface the labels.
        setMinimized(minimized, 0);
      })
      .onUpdate((event) => {
        const index = indexAtX(event.x, progress.get());
        slideIndex.set(index);

        const rounded = Math.round(index);
        if (rounded !== lastTicked.get()) {
          lastTicked.set(rounded);
          runOnJS(tick)();
        }
      })
      .onFinalize(() => {
        // Fires on failure too (e.g. the touch was a tap) — only act when
        // the pan actually activated, or we'd stomp the tap's navigation.
        if (!isDragging.get()) {
          return;
        }
        const rounded = Math.round(slideIndex.get());
        slideIndex.set(withSpring(rounded, SLIDE_SPRING));
        runOnJS(selectIndex)(rounded);
        isDragging.set(false);
      });

    const tap = Gesture.Tap()
      // Real fingers drift a few points — the default tolerance (~2pt)
      // makes ordinary taps fail. Past 6pt horizontal the pan takes over.
      .maxDistance(16)
      .maxDuration(400)
      .onEnd((event, success) => {
        if (!success) {
          return;
        }
        const index = Math.round(indexAtX(event.x, progress.get()));
        slideIndex.set(withSpring(index, SLIDE_SPRING));
        setMinimized(minimized, 0);
        runOnJS(selectIndex)(index);
      });

    return Gesture.Race(pan, tap);
  }, [
    windowWidth,
    tabCount,
    hasAction,
    selectIndex,
    tick,
    isDragging,
    lastTicked,
    slideIndex,
    minimized,
    progress,
  ]);

  // Revolut-style: the bar shrinks in both dimensions. The inset sits on the
  // row, so the pill and the action circle move inward together.
  const rowStyle = useAnimatedStyle(() => ({
    height: getBarHeight(progress.get()),
    marginHorizontal: getSideInset(progress.get()),
  }));

  // The capsule shape lives on the glass view itself: iOS 26 glass renders
  // its own native corner configuration (true squircle + rim lighting).
  // Clipping a rectangular glass with an RN mask breaks that. The circle has
  // the same height as the pill, so it shares this radius.
  const shapeStyle = useAnimatedStyle(() => ({
    borderRadius: getBarHeight(progress.get()) / 2,
  }));

  // One shared highlight that slides between tabs (transform-only → GPU).
  // All geometry derives from shared values, never from layout callbacks.
  const highlightStyle = useAnimatedStyle(() => {
    const barHeight = getBarHeight(progress.get());
    const height = interpolate(
      progress.get(),
      [0, 1],
      [HIGHLIGHT_EXPANDED, HIGHLIGHT_MINIMIZED],
      Extrapolation.CLAMP
    );
    const barWidth = getPillWidth(progress.get(), windowWidth, hasAction);
    const itemWidth = (barWidth - ROW_PAD_H * 2) / tabCount;
    return {
      height,
      width: itemWidth,
      borderRadius: height / 2,
      top: (barHeight - height) / 2,
      transform: [{ translateX: ROW_PAD_H + itemWidth * slideIndex.get() }],
    };
  });

  const bottomOffset = getBarBottomOffset(insets.bottom);
  const barContext = useMemo(
    () => ({ slideIndex, isDragging, theme }),
    [slideIndex, isDragging, theme]
  );

  return (
    <View
      {...props}
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
    >
      {edgeFade ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: bottomOffset + EXPANDED_HEIGHT + FADE_BLEED,
            experimental_backgroundImage: `linear-gradient(to top, ${edgeFade} 0%, transparent 100%)`,
          }}
        />
      ) : null}
      <View
        pointerEvents="box-none"
        style={{ marginHorizontal: BAR_MARGIN, marginBottom: bottomOffset }}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[{ flexDirection: "row", gap: ACTION_GAP }, rowStyle]}
        >
          <GestureDetector gesture={gesture}>
            <View style={{ flex: 1 }}>
              <GlassSurface blurTarget={blurTarget} shapeStyle={shapeStyle} />
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    backgroundColor: theme.highlight,
                    borderCurve: "continuous",
                  },
                  highlightStyle,
                ]}
              />
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: ROW_PAD_H,
                }}
              >
                <BarContext.Provider value={barContext}>{children}</BarContext.Provider>
              </View>
            </View>
          </GestureDetector>
          {action ? (
            <GlassActionButton
              action={action}
              theme={theme}
              blurTarget={blurTarget}
              progress={progress}
              shapeStyle={shapeStyle}
            />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

/** Icon rendered at a fixed tint (used twice for the crossfade layers). */
function TabGlyph({ item, tint }: { item: GlassTabItem; tint: string }) {
  if (item.renderIcon) {
    return (
      <View style={{ height: ICON_SIZE, justifyContent: "center" }}>
        {item.renderIcon({ tint, size: ICON_SIZE })}
      </View>
    );
  }
  if (item.icon) {
    return <SymbolView name={item.icon} tintColor={tint} size={ICON_SIZE} weight="semibold" />;
  }
  return null;
}

/** One tab trigger: icon + label that fades when minimized. */
export function GlassTabButton({
  item,
  index,
  isFocused,
  onPress,
  ref: _slotRef,
  ...props
}: TabTriggerSlotProps & { item: GlassTabItem; index: number }) {
  const minimized = useMinimizeState();
  const progress = minimized.progress;
  const bar = use(BarContext);
  const theme = bar?.theme ?? DEFAULT_THEME;
  const slideIndex = bar?.slideIndex;

  // Covers programmatic navigation too (deep links, back gestures). While
  // scrubbing, the finger owns the highlight — never fight it with a spring.
  useEffect(() => {
    if (isFocused && bar && !bar.isDragging.get()) {
      bar.slideIndex.set(withSpring(index, SLIDE_SPRING));
    }
  }, [isFocused, index, bar]);

  // Tint follows the sliding highlight, not navigation focus: whatever the
  // pill is over lights up — live while scrubbing, traveling on taps.
  const activeGlyphStyle = useAnimatedStyle(() => ({
    opacity: slideIndex ? 1 - Math.min(Math.abs(slideIndex.get() - index), 1) : isFocused ? 1 : 0,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP),
    color: slideIndex
      ? interpolateColor(
          Math.min(Math.abs(slideIndex.get() - index), 1),
          [0, 1],
          [theme.activeTint, theme.inactiveTint]
        )
      : isFocused
        ? theme.activeTint
        : theme.inactiveTint,
  }));

  // Height is animated EXPLICITLY (not derived from children) so the icon
  // stays perfectly centered every frame — layout-driven sizing lags behind
  // UI-thread animation.
  const boxStyle = useAnimatedStyle(() => ({
    height: interpolate(
      progress.get(),
      [0, 1],
      [HIGHLIGHT_EXPANDED, HIGHLIGHT_MINIMIZED],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Pressable
      {...props}
      onPress={(event) => {
        // The GestureDetector normally consumes touches; this still fires
        // for accessibility activation (VoiceOver) and keyboard focus.
        if (bar) bar.slideIndex.set(withSpring(index, SLIDE_SPRING));
        setMinimized(minimized, 0);
        onPress?.(event);
      }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={[
          {
            alignSelf: "stretch",
            alignItems: "center",
            paddingTop: ITEM_PAD_V,
            overflow: "hidden",
          },
          boxStyle,
        ]}
      >
        {/* Inactive glyph underneath, active glyph crossfading on top. */}
        <View>
          <TabGlyph item={item} tint={theme.inactiveTint} />
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { alignItems: "center", justifyContent: "center" },
              activeGlyphStyle,
            ]}
          >
            <TabGlyph item={item} tint={theme.activeTint} />
          </Animated.View>
        </View>
        {/* Fades out and is clipped by the shrinking box — no layout anim. */}
        <Animated.Text
          numberOfLines={1}
          // Larger Text: the label grows a little, then shrinks to fit the fixed bar.
          maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_MULTIPLIER}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[{ fontSize: 9.5, fontWeight: "600", marginTop: ITEM_GAP }, labelStyle]}
        >
          {item.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Fading tab screen ─────────────────────────────────────────────────────

/** Strong ease-out — entering content should feel instant, then settle. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function FadeIn({ focused, children }: PropsWithChildren<{ focused: boolean }>) {
  const progress = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Don't animate the very first screen on app launch.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (focused) {
      progress.set(0);
      progress.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
    } else {
      // Outgoing screen hides instantly (display: none) — only entries animate.
      progress.set(0);
    }
  }, [focused, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    // Whisper of depth; never enter from nothing (scale stays ≥ 0.985).
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.985, 1]) }],
  }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

/**
 * Drop-in for TabSlot's renderFn: identical to expo-router's default render,
 * plus a subtle fade + micro-scale on the screen becoming focused.
 */
export function renderFadingTabScreen(
  descriptor: TabsDescriptor,
  { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions
) {
  const {
    lazy = true,
    unmountOnBlur,
    freezeOnBlur,
  } = descriptor.options as {
    lazy?: boolean;
    unmountOnBlur?: boolean;
    freezeOnBlur?: boolean;
  };
  if (unmountOnBlur && !isFocused) {
    return null;
  }
  if (lazy && !loaded && !isFocused) {
    return null;
  }
  return (
    <Screen
      key={descriptor.route.key}
      enabled={detachInactiveScreens}
      activityState={isFocused ? 2 : 0}
      freezeOnBlur={freezeOnBlur}
      style={[styles.screen, isFocused ? styles.focused : styles.unfocused]}
    >
      <FadeIn focused={isFocused}>{descriptor.render()}</FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
    height: "100%",
  },
  focused: {
    zIndex: 1,
    display: "flex",
    flexShrink: 0,
    flexGrow: 1,
  },
  unfocused: {
    zIndex: -1,
    display: "none",
    flexShrink: 1,
    flexGrow: 0,
  },
});

/** Gap between the pill and the bottom edge, clearing the home indicator. */
function getBarBottomOffset(bottomInset: number) {
  return Math.max(bottomInset - 16, 36);
}

/**
 * Bottom space covered by the floating bar (pill + its gap above the home
 * indicator), or 0 outside the glass tabs. Add it to your scroll content's
 * bottom padding so the last items can scroll clear of the bar.
 */
export function useGlassTabBarInset(): number {
  const insets = useSafeAreaInsets();
  const insideTabs = use(MinimizeContext) != null;
  return insideTabs ? tabBarTop(insets.bottom) : 0;
}

/** How far the expanded tab bar reaches above the bottom of the screen. */
export function tabBarTop(bottomInset: number): number {
  return getBarBottomOffset(bottomInset) + EXPANDED_HEIGHT;
}
