import { GlassSurface } from "@/components/glass-surface";
import { GLASS_BLUR_INTENSITY } from "@/lib/glass";
import { useReduceTransparency } from "@/lib/reduce-transparency";
import { useGlassTabBarInset, useMinimizeOnScroll } from "@/components/glass-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView, BlurView } from "expo-blur";
import { useNavigation } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Typography } from "heroui-native/text";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  type FlatList,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useUniwind } from "uniwind";

/* ============================================================================
 * Public types
 * ========================================================================== */

/**
 * A virtualized list under the header, for long lists: only the items near the screen
 * stay mounted. The screen's `children` render above the items, below the title.
 */
export type LargeTitleList<T> = {
  data: readonly T[];
  renderItem: (item: T) => ReactElement;
  keyExtractor: (item: T) => string;
  /** Rendered after the items (a "Show older" button). */
  footer?: ReactNode;
  /** Rendered instead of the items when `data` is empty. */
  empty?: ReactNode;
};

export type LargeTitleScreenProps<T = never> = {
  title: string;
  /** Small uppercase line above the large title, e.g. "10 entries · 3 reviews". */
  eyebrow?: string;
  subtitle?: string;
  /** A long title (a record's name): 28 pt, wrapping onto as many lines as it needs. */
  wrapTitle?: boolean;
  /**
   * Full-bleed content above the large title (artwork, cover image...). It starts under the
   * status bar and the action buttons float over it until the header collapses.
   */
  hero?: ReactNode;
  /** Rendered after the automatic back button. */
  leftContent?: ReactNode;
  /** Trailing actions; `HeaderIconButton` matches the back button. */
  rightContent?: ReactNode;
  /** Overrides the automatic back button (shown when an enclosing stack can pop). */
  showBackButton?: boolean;
  /**
   * Called once each time the user scrolls within `END_REACHED_OFFSET` of the bottom, for
   * infinite lists. It re-arms when the content grows, so load the next page here.
   */
  onEndReached?: () => void;
  /** Pass `refreshControl` for pull-to-refresh; see `HEADER_BAR_HEIGHT` for its offset. */
  scrollViewProps?: Omit<ScrollViewProps, "children" | "onScroll">;
  /** Renders the content as a virtualized list instead of one scroll view (see `LargeTitleList`). */
  list?: LargeTitleList<T>;
  children: ReactNode;
};

/* ============================================================================
 * Constants
 * ========================================================================== */

/** Compact bar height below the safe-area inset; leaves room around the action buttons. */
const BAR_HEIGHT = 56;
/** Height of the compact bar below the safe-area inset, for offsetting refresh spinners. */
export const HEADER_BAR_HEIGHT = BAR_HEIGHT;
/** Distance from the bottom (in points) at which `onEndReached` fires. */
const END_REACHED_OFFSET = 320;
/** Minimum touch target (iOS HIG / Material): 44x44. */
const ACTION_SIZE = 44;
const TITLE_ACTION_GAP = 8;
/** Horizontal padding of the action bar. */
const ACTIONS_PADDING = 14;
/** The large title counts as collapsed once the compact title is more than half visible. */
const COLLAPSED_THRESHOLD = 0.5;
/** Cap on font scaling for the fixed-height compact bar. */
const COMPACT_MAX_FONT_MULTIPLIER = 1.3;
const BOTTOM_PADDING = 32;
const TITLE_FADE = { duration: 150, easing: Easing.inOut(Easing.cubic) } as const;

/** Distances below the top safe-area inset where the large title starts / finishes fading. */
const FADE_RANGES = {
  plain: [36, 8],
  supporting: [20, -8],
} as const;

/* ============================================================================
 * Back navigation: find the nearest enclosing *stack* that can pop, and pop that same stack.
 * Tab history is deliberately skipped so a tab root never shows a back button.
 * Uses only the public `useNavigation`; the structural type avoids importing navigation internals.
 * ========================================================================== */

type NavigationNode = {
  getState: () => { type?: string; index?: number } | undefined;
  getParent: () => NavigationNode | undefined;
  goBack: () => void;
  addListener: (event: "focus" | "state", callback: () => void) => () => void;
};

function findPoppableStack(navigation: NavigationNode | undefined): NavigationNode | undefined {
  for (let node = navigation; node != null; node = node.getParent()) {
    const state = node.getState();
    if (state?.type === "stack" && (state.index ?? 0) > 0) return node;
  }
  return undefined;
}

function useStackBack() {
  const navigation = useNavigation() as unknown as NavigationNode;
  const [canGoBack, setCanGoBack] = useState(() => findPoppableStack(navigation) != null);

  useEffect(() => {
    const update = () => setCanGoBack(findPoppableStack(navigation) != null);
    update();
    const unsubscribeFocus = navigation.addListener("focus", update);
    const unsubscribeState = navigation.addListener("state", update);
    return () => {
      unsubscribeFocus();
      unsubscribeState();
    };
  }, [navigation]);

  const goBack = useCallback(() => findPoppableStack(navigation)?.goBack(), [navigation]);
  return { canGoBack, goBack };
}

/* ============================================================================
 * Small pieces
 * ========================================================================== */

type HeaderIconButtonProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  /** Optional only when a HeroUI trigger with `asChild` supplies it (the detail screen's menu). */
  onPress?: () => void;
  /** For HeroUI triggers that measure the button to place a menu. */
  ref?: Ref<ComponentRef<typeof Pressable>>;
  /** `accent` and `danger` tint the icon; `fill` is a solid accent button (a sheet's confirm). */
  tone?: "default" | "accent" | "danger" | "fill";
  isDisabled?: boolean;
};

/** Visible glass circle inside the 44 pt touch target. */
const HEADER_BUTTON_SIZE = 36;
const HEADER_ICON_SIZE = 18;
const PRESS_SPRING = { duration: 260, dampingRatio: 0.7 } as const;

/** A 36 px round glass button with an 18 px icon and a 44 pt touch area; no shadow. */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  tone = "default",
  isDisabled = false,
  ref,
}: HeaderIconButtonProps) {
  const [foreground, accent, accentForeground, danger] = useThemeColor([
    "foreground",
    "accent",
    "accent-foreground",
    "danger",
  ]);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const pressTo = (value: number) => {
    scale.set(reduceMotion ? 1 : withSpring(value, PRESS_SPRING));
  };
  const color =
    tone === "accent"
      ? accent
      : tone === "danger"
        ? danger
        : tone === "fill"
          ? accentForeground
          : foreground;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => pressTo(0.88)}
      onPressOut={() => pressTo(1)}
      hitSlop={(ACTION_SIZE - HEADER_BUTTON_SIZE) / 2}
      style={{ opacity: isDisabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.headerButton, pressStyle]}>
        <GlassSurface radius={HEADER_BUTTON_SIZE / 2} fill={tone === "fill" ? accent : undefined} />
        <Ionicons name={icon} size={HEADER_ICON_SIZE} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Large title block. On every scroll frame it measures its own position on screen, fades and
 * lifts out as it reaches the bar, and writes the 0..1 collapse progress into `compact`.
 * Measuring the real position means anything above it (a hero) is accounted for automatically.
 */
function CollapsingTitle({
  scrollY,
  compact,
  fadeStart,
  fadeEnd,
  remeasure,
  children,
}: {
  scrollY: SharedValue<number>;
  compact: SharedValue<number>;
  /** Distance below the top safe-area inset where the title starts fading. */
  fadeStart: number;
  /** Distance below the top safe-area inset where the title is fully gone. */
  fadeEnd: number;
  /** Bumped to measure again without a scroll event. */
  remeasure: SharedValue<number>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const { top: topInset } = useSafeAreaInsets();
  const ref = useAnimatedRef<Animated.View>();

  // One measurement per frame feeds `compact`; the style below reads it.
  useAnimatedReaction(
    () => {
      scrollY.get(); // Re-run on every scroll frame.
      remeasure.get(); // And after the content changes size (see `LargeTitleScreen`).
      const measured = measure(ref);
      if (!measured) return 0;
      return interpolate(
        measured.pageY,
        [topInset + fadeStart, topInset + fadeEnd],
        [0, 1],
        Extrapolation.CLAMP
      );
    },
    (progress) => compact.set(progress)
  );

  const style = useAnimatedStyle(() => {
    const progress = compact.get();
    if (reduced) {
      return { opacity: progress >= 1 ? 0 : 1 };
    }
    return {
      opacity: 1 - progress,
      transform: [{ translateY: -12 * progress }],
    };
  });

  return (
    <Animated.View ref={ref} style={style} collapsable={false}>
      {children}
    </Animated.View>
  );
}

/** Compact title in the bar; fades and rises in as the large title collapses. */
function CompactTitle({
  title,
  compact,
  collapsed,
  inset,
}: {
  title: string;
  compact: SharedValue<number>;
  collapsed: boolean;
  inset: number;
}) {
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const progress = compact.get();
    if (reduced) {
      return { opacity: progress > COLLAPSED_THRESHOLD ? 1 : 0 };
    }
    return {
      opacity: withTiming(progress, TITLE_FADE),
      transform: [{ translateY: withTiming(interpolate(progress, [0, 1], [10, 0]), TITLE_FADE) }],
    };
  });

  return (
    <Animated.View
      style={[styles.bar, { paddingHorizontal: inset, pointerEvents: "none" }, style]}
      accessibilityElementsHidden={!collapsed}
      importantForAccessibility={collapsed ? "auto" : "no-hide-descendants"}
    >
      <Typography
        accessibilityRole="header"
        className="w-full text-center text-[17px]/[22px] font-bold text-foreground"
        numberOfLines={1}
        maxFontSizeMultiplier={COMPACT_MAX_FONT_MULTIPLIER}
        style={{ includeFontPadding: false }}
      >
        {title}
      </Typography>
    </Animated.View>
  );
}

/** Blur behind the compact bar; fades in with the compact title. */
function HeaderBlur({
  compact,
  height,
  blurTarget,
}: {
  compact: SharedValue<number>;
  height: number;
  blurTarget: RefObject<ComponentRef<typeof View> | null>;
}) {
  const isDark = useUniwind().theme === "dark";
  const reduceTransparency = useReduceTransparency();
  // Fade a wrapper rather than animating `intensity`: BlurView re-renders after mount (to resolve
  // `blurTarget`) and its JS `intensity` default would overwrite the animated value.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(compact.get(), [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.blur, { height, pointerEvents: "none" }, fadeStyle]}>
      {reduceTransparency ? (
        // Reduce Transparency: an opaque bar in the screen colour, with a hairline (`fb` preset).
        <View className="absolute inset-0 border-b border-separator bg-background" />
      ) : (
        <>
          <BlurView
            // A native material, not a color: there is no semantic token for a blur tint.
            tint={isDark ? "dark" : "light"}
            intensity={GLASS_BLUR_INTENSITY}
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            style={StyleSheet.absoluteFill}
          />
          {/* A light wash of the theme background keeps the bar the same hue as the screen. */}
          <View className="absolute inset-0 bg-background opacity-10" />
        </>
      )}
    </Animated.View>
  );
}

/* ============================================================================
 * Screen
 * ========================================================================== */

export function LargeTitleScreen<T = never>({
  title,
  eyebrow,
  subtitle,
  wrapTitle = false,
  hero,
  leftContent,
  rightContent,
  showBackButton,
  onEndReached,
  scrollViewProps,
  list,
  children,
}: LargeTitleScreenProps<T>) {
  const insets = useSafeAreaInsets();
  const bottomInset = useGlassTabBarInset();
  const minimizeTabBar = useMinimizeOnScroll();
  const { t } = useTranslation();
  const { canGoBack, goBack } = useStackBack();
  const background = useThemeColor("background");
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(ACTION_SIZE);
  const [rightWidth, setRightWidth] = useState(ACTION_SIZE);

  // `CollapsingTitle` writes the collapse progress into `compact`, which drives the compact
  // title and the blur.
  const scrollY = useSharedValue(0);
  const compact = useSharedValue(0);
  const nearEnd = useSharedValue(false);
  const trackScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
    if (!onEndReached) return;

    const distance =
      event.contentSize.height - (event.contentOffset.y + event.layoutMeasurement.height);
    const isNear = distance < END_REACHED_OFFSET;
    if (isNear !== nearEnd.get()) {
      nearEnd.set(isNear);
      if (isNear) scheduleOnRN(onEndReached);
    }
  });
  const onScroll = useComposedEventHandler([trackScroll, minimizeTabBar]);

  // When the content shrinks (a filter leaves a short list), the scroll view moves back without a
  // scroll event, so the title would stay collapsed. Clamp the offset ourselves, then measure the
  // title again once the new layout is on screen (two frames: one for the layout, one to draw).
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const listRef = useRef<FlatList<T>>(null);
  const viewportHeight = useRef(0);
  const remeasure = useSharedValue(0);
  const clampToContent = (contentHeight: number): void => {
    const max = Math.max(0, contentHeight - viewportHeight.current);
    if (viewportHeight.current > 0 && scrollY.get() > max) {
      scrollY.set(max);
      if (list) listRef.current?.scrollToOffset({ offset: max, animated: false });
      else scrollRef.current?.scrollTo({ y: max, animated: false });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => remeasure.set(remeasure.get() + 1)));
  };

  // Notify JS only when the threshold is crossed.
  useAnimatedReaction(
    () => compact.get() > COLLAPSED_THRESHOLD,
    (isCollapsed, previous) => {
      if (isCollapsed !== previous) scheduleOnRN(setCollapsed, isCollapsed);
    }
  );

  const hasHero = hero != null;
  const backVisible = showBackButton ?? canGoBack;
  const barHeight = insets.top + BAR_HEIGHT;
  // A hero bleeds under the bar; plain screens start their content below it.
  const contentTopInset = hasHero ? 0 : barHeight;
  const [fadeStart, fadeEnd] = eyebrow || subtitle ? FADE_RANGES.supporting : FADE_RANGES.plain;
  // Symmetric, clearing the wider action slot.
  const compactTitleInset =
    ACTIONS_PADDING + Math.max(leftWidth, rightWidth, ACTION_SIZE) + TITLE_ACTION_GAP;

  // The same scroll behaviour for the scroll view and the list.
  const scrollProps = {
    automaticallyAdjustContentInsets: false,
    contentInsetAdjustmentBehavior: "never" as const,
    showsHorizontalScrollIndicator: false,
    ...scrollViewProps,
    // Android blurs a snapshot of the target's *inner* native view and fills unpainted
    // pixels with the window background (black here), so the background must be painted
    // by the content itself.
    style: [{ backgroundColor: background }, scrollViewProps?.style],
    ...(Platform.OS === "ios"
      ? { scrollIndicatorInsets: { top: barHeight, bottom: bottomInset } }
      : null),
    automaticallyAdjustsScrollIndicatorInsets: false,
    scrollEventThrottle: 16,
    onScroll,
    onLayout: (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      scrollViewProps?.onLayout?.(event);
    },
    onContentSizeChange: (width: number, height: number) => {
      clampToContent(height);
      scrollViewProps?.onContentSizeChange?.(width, height);
    },
    contentContainerStyle: [
      scrollViewProps?.contentContainerStyle,
      { paddingTop: contentTopInset, paddingBottom: BOTTOM_PADDING + bottomInset },
    ],
  };

  // Everything above the list items: in the scroll view, or the list's header.
  const header = (
    <>
      {hero}
      <CollapsingTitle
        scrollY={scrollY}
        compact={compact}
        fadeStart={fadeStart}
        fadeEnd={fadeEnd}
        remeasure={remeasure}
      >
        <View
          className={hasHero ? "gap-0.5 px-5 pt-4 pb-1" : "gap-0.5 px-5 pb-1"}
          accessibilityElementsHidden={collapsed}
          importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
        >
          {eyebrow ? (
            <Typography
              className="text-[13px]/[18px] font-semibold tracking-[0.8px] text-muted uppercase"
              numberOfLines={1}
            >
              {eyebrow}
            </Typography>
          ) : null}
          <Typography
            accessibilityRole="header"
            className={
              wrapTitle
                ? "text-[28px]/[34px] font-bold tracking-[0.4px] text-foreground"
                : "text-[34px]/[41px] font-bold tracking-[0.4px] text-foreground"
            }
            numberOfLines={wrapTitle ? undefined : 2}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography className="text-[15px]/[20px] font-medium text-muted" numberOfLines={2}>
              {subtitle}
            </Typography>
          ) : null}
        </View>
      </CollapsingTitle>
      {children}
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <BlurTargetView ref={blurTarget} style={styles.fill}>
        {list ? (
          <Animated.FlatList
            {...scrollProps}
            ref={listRef}
            data={list.data}
            renderItem={({ item }) => list.renderItem(item)}
            keyExtractor={(item) => list.keyExtractor(item)}
            ListHeaderComponent={header}
            ListFooterComponent={<>{list.footer}</>}
            ListEmptyComponent={<>{list.empty}</>}
            // Few items mounted at a time: rows can be heavy (swipeable rows).
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={7}
          />
        ) : (
          <Animated.ScrollView {...scrollProps} ref={scrollRef}>
            {header}
          </Animated.ScrollView>
        )}
      </BlurTargetView>

      <HeaderBlur compact={compact} height={barHeight} blurTarget={blurTarget} />

      <View style={[styles.header, { height: barHeight, pointerEvents: "box-none" }]}>
        <CompactTitle
          title={title}
          compact={compact}
          collapsed={collapsed}
          inset={compactTitleInset}
        />
        <View style={[styles.bar, styles.actions, { pointerEvents: "box-none" }]}>
          <View
            style={[styles.slot, styles.slotStart, { pointerEvents: "box-none" }]}
            onLayout={(event) => setLeftWidth(event.nativeEvent.layout.width)}
          >
            {backVisible ? (
              <HeaderIconButton icon="arrow-back" label={t("common.back")} onPress={goBack} />
            ) : null}
            {leftContent}
          </View>
          <View
            style={[styles.slot, styles.slotEnd, { pointerEvents: "box-none" }]}
            onLayout={(event) => setRightWidth(event.nativeEvent.layout.width)}
          >
            {rightContent}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    flex: 1,
  },
  blur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },
  /** The compact bar: the bottom `BAR_HEIGHT` of the header, below the status bar. */
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: ACTIONS_PADDING,
  },
  slot: {
    minWidth: ACTION_SIZE,
    minHeight: ACTION_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: TITLE_ACTION_GAP,
  },
  slotStart: {
    justifyContent: "flex-start",
  },
  slotEnd: {
    justifyContent: "flex-end",
  },
});
