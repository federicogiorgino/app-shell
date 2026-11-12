import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useRef, type ComponentProps, type ComponentRef, type JSX, type ReactNode } from "react";
import { type AccessibilityActionEvent, Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  type SharedValue,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The colour of an action panel; semantic, so it follows the theme. */
export type SwipeTone = "accent" | "success" | "warning" | "danger" | "default";

export interface SwipeAction {
  /** Also the accessibility action name. */
  key: string;
  label: string;
  icon: IconName;
  tone: SwipeTone;
  onAction: () => void;
}

/** Where a long-pressed row is on screen, from `measureInWindow`, for `useContextMenu`. */
export interface RowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A right swipe past this commits the leading action; a long left swipe past the other runs the last trailing one. */
const LEADING_COMMIT_AT = 96;
const FULL_SWIPE_AT = 215;
/** Width of one trailing action button. */
const ACTION_WIDTH = 78;
/**
 * Sideways travel before a swipe takes the touch. Gesture Handler's default (10) equals the
 * scroll view's own start distance, so a slightly slanted scroll was caught by the row and the
 * list stuck. Twice that lets a vertical scroll win first.
 */
const SWIPE_START = 20;
/** About 470 ms opens the context menu, like iOS. */
const LONG_PRESS_MS = 470;
/** Gap between the screen edge and the leading panel's content. */
const PANEL_INSET = 22;

/** Only one row is open at a time; tapping elsewhere or scrolling closes it. */
let openRow: SwipeableMethods | null = null;

/** Closes the open row, if any. Returns true when one was open (the tap only closes it). */
export function closeOpenRow(): boolean {
  if (!openRow) return false;
  openRow.close();
  openRow = null;
  return true;
}

function useToneColors(): Record<SwipeTone, { fill: string; tint: string }> {
  const [
    accent,
    accentForeground,
    success,
    successForeground,
    warning,
    warningForeground,
    danger,
    dangerForeground,
    defaultColor,
    defaultForeground,
  ] = useThemeColor([
    "accent",
    "accent-foreground",
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "danger",
    "danger-foreground",
    "default",
    "default-foreground",
  ]);
  return {
    accent: { fill: accent, tint: accentForeground },
    success: { fill: success, tint: successForeground },
    warning: { fill: warning, tint: warningForeground },
    danger: { fill: danger, tint: dangerForeground },
    default: { fill: defaultColor, tint: defaultForeground },
  };
}

/**
 * The panel behind a right swipe. Colours and layout are plain styles: these panels render inside
 * the swipeable's own containers, where class styles were not applied on device.
 */
function LeadingPanel({
  progress,
  action,
}: {
  progress: SharedValue<number>;
  action: SwipeAction;
}): JSX.Element {
  const { fill, tint } = useToneColors()[action.tone];
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.15], [0, 1], "clamp"),
  }));
  return (
    <Animated.View style={[styles.leading, { backgroundColor: fill }, fade]}>
      <Ionicons name={action.icon} size={20} color={tint} />
      <Text className="text-secondary font-semibold" style={{ color: tint }}>
        {action.label}
      </Text>
    </Animated.View>
  );
}

/** The buttons behind a left swipe; on a full swipe the others fold away behind the last one. */
function TrailingActions({
  translation,
  actions,
  fullSwipe,
  deepRef,
  onAction,
}: {
  translation: SharedValue<number>;
  actions: readonly SwipeAction[];
  fullSwipe: boolean;
  deepRef: { current: boolean };
  onAction: (action: SwipeAction) => void;
}): JSX.Element {
  const tones = useToneColors();
  const setDeep = (deep: boolean): void => {
    deepRef.current = deep;
  };
  useAnimatedReaction(
    () => fullSwipe && translation.get() < -FULL_SWIPE_AT,
    (deep, previous) => {
      if (deep !== previous) scheduleOnRN(setDeep, deep);
    }
  );
  const foldStyle = useAnimatedStyle(() => ({
    width: fullSwipe && translation.get() < -FULL_SWIPE_AT ? 0 : ACTION_WIDTH,
  }));
  // Hidden while the row is closed: otherwise the row's anti-aliased edge shows a hairline of
  // colour at rest.
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(translation.get(), [-8, 0], [1, 0], "clamp"),
  }));
  const last = actions.length - 1;

  return (
    <Animated.View style={[{ width: actions.length * ACTION_WIDTH }, styles.trailing, fade]}>
      {actions.map((action, index) => {
        const { fill, tint } = tones[action.tone];
        const button = (
          <Pressable
            accessibilityRole="button"
            onPress={() => onAction(action)}
            style={[styles.action, { backgroundColor: fill }]}
          >
            <Ionicons name={action.icon} size={20} color={tint} />
            <Text className="text-caption font-semibold" style={{ color: tint }}>
              {action.label}
            </Text>
          </Pressable>
        );
        return index === last ? (
          <View key={action.key} style={styles.lastSlot}>
            {button}
          </View>
        ) : (
          <Animated.View key={action.key} style={[styles.foldSlot, foldStyle]}>
            {button}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leading: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: PANEL_INSET,
  },
  trailing: { flexDirection: "row", alignSelf: "stretch" },
  foldSlot: { overflow: "hidden", alignSelf: "stretch" },
  lastSlot: { flex: 1, alignSelf: "stretch" },
  action: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
});

export interface SwipeableRowProps {
  children: ReactNode;
  onPress?: () => void;
  /** Long press, with where the row is on screen (pass it to `useContextMenu`). */
  onLongPress?: (rect: RowRect) => void;
  accessibilityLabel?: string;
  /** Revealed by a right swipe; a swipe past the commit point runs it and the row closes. */
  leadingAction?: SwipeAction;
  /** Revealed by a left swipe, left to right. */
  trailingActions?: readonly SwipeAction[];
  /** A long left swipe runs the last trailing action straight away (Delete, usually). */
  fullSwipe?: boolean;
  /** More commands for VoiceOver and TalkBack (the swipe actions are added automatically). */
  extraAccessibilityActions?: readonly SwipeAction[];
}

/**
 * A list row with the iOS gestures: tap, long press (for a context menu), swipe right for one
 * action, swipe left for buttons, and a long left swipe for the last button. Built on Gesture
 * Handler's `ReanimatedSwipeable`. Every action is also an accessibility action, so VoiceOver and
 * TalkBack can run it without a gesture. Pair a destructive action with an Undo toast.
 */
export function SwipeableRow({
  children,
  onPress,
  onLongPress,
  accessibilityLabel,
  leadingAction,
  trailingActions = [],
  fullSwipe = false,
  extraAccessibilityActions = [],
}: SwipeableRowProps): JSX.Element {
  const swipeable = useRef<SwipeableMethods>(null);
  const content = useRef<ComponentRef<typeof View>>(null);
  const deep = useRef(false);

  const run = (action: SwipeAction): void => {
    closeOpenRow();
    action.onAction();
  };

  const allActions = [
    ...(leadingAction ? [leadingAction] : []),
    ...trailingActions,
    ...extraAccessibilityActions,
  ];

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={1}
      dragOffsetFromLeft={SWIPE_START}
      dragOffsetFromRight={-SWIPE_START}
      leftThreshold={LEADING_COMMIT_AT}
      rightThreshold={(trailingActions.length * ACTION_WIDTH) / 2}
      overshootRight={fullSwipe}
      overshootLeft={false}
      enabled={Boolean(leadingAction) || trailingActions.length > 0}
      renderLeftActions={
        leadingAction
          ? (progress) => <LeadingPanel progress={progress} action={leadingAction} />
          : undefined
      }
      renderRightActions={
        trailingActions.length > 0
          ? (_progress, translation) => (
              <TrailingActions
                translation={translation}
                actions={trailingActions}
                fullSwipe={fullSwipe}
                deepRef={deep}
                onAction={run}
              />
            )
          : undefined
      }
      onSwipeableWillOpen={(direction) => {
        if (direction === SwipeDirection.LEFT && deep.current) {
          deep.current = false;
          const last = trailingActions.at(-1);
          if (last) run(last);
          return;
        }
        if (direction === SwipeDirection.LEFT) {
          if (openRow && openRow !== swipeable.current) openRow.close();
          openRow = swipeable.current;
        }
      }}
      onSwipeableOpen={(direction) => {
        // Slid right past the commit point: run the leading action, then come back.
        if (direction === SwipeDirection.RIGHT && leadingAction) {
          swipeable.current?.close();
          leadingAction.onAction();
        }
      }}
      onSwipeableClose={() => {
        if (openRow === swipeable.current) openRow = null;
      }}
    >
      <Pressable
        ref={content}
        className="bg-surface"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={allActions.map((action) => ({
          name: action.key,
          label: action.label,
        }))}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          const action = allActions.find((item) => item.key === event.nativeEvent.actionName);
          if (action) run(action);
        }}
        onPress={() => {
          if (closeOpenRow()) return;
          onPress?.();
        }}
        onLongPress={
          onLongPress
            ? () => {
                closeOpenRow();
                content.current?.measureInWindow((x, y, width, height) =>
                  onLongPress({ x, y, width, height })
                );
              }
            : undefined
        }
        delayLongPress={LONG_PRESS_MS}
      >
        {children}
      </Pressable>
    </ReanimatedSwipeable>
  );
}
