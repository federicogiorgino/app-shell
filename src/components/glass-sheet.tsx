import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/glass-surface";
import { HeaderIconButton } from "@/components/large-title-screen";
import { RADIUS } from "@/lib/metrics";

/** Sheets are 42 px round, inset 8 from the screen edges. */
const SHEET_RADIUS = RADIUS.sheet;
const SHEET_INSET = 8;
/** The `backdrop` token: black at 20%. */
const BACKDROP_OPACITY = 0.2;

export type GlassSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Shown centred between the cancel and confirm buttons. */
  title?: string;
  /** Adds the round confirm button (accent fill) in the header. */
  onConfirm?: () => void;
  confirmLabel?: string;
  /** The confirm button's glyph; a check by default. */
  confirmIcon?: ComponentProps<typeof Ionicons>["name"];
  isConfirmDisabled?: boolean;
  /** Called once the open animation ends, e.g. to focus a field. */
  onShown?: () => void;
  /** Android: the `BlurTargetView` of the screen behind, so the glass blurs it like the tab bar. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
  children: ReactNode;
};

/**
 * A floating glass sheet: inset from the edges, above the
 * bottom safe area, 42 px corners, a grabber, and round cancel and confirm buttons.
 *
 * Built on Gorhom's `BottomSheet` rendered in place, not in a portal: the tab bar
 * and header glass, which looked right on device, are in the normal view tree, while the
 * portalled HeroUI sheet looked flat. Render it in the layout that owns the screen (the tabs
 * layout for quick add), so its glass sees the same content as the tab bar. Android back closes
 * the sheet before anything else.
 */
export function GlassSheet({
  isOpen,
  onOpenChange,
  title,
  onConfirm,
  confirmLabel,
  confirmIcon = "checkmark",
  isConfirmDisabled,
  onShown,
  blurTarget,
  children,
}: GlassSheetProps): JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheet>(null);
  // A sheet mounted already open (the host mounts it on `present`) must start open: calling
  // `expand()` before Gorhom has laid out is ignored, and its first `onChange(-1)` would close it.
  const [initialIndex] = useState(isOpen ? 0 : -1);
  const grabberColor = useThemeColor("muted");

  useEffect(() => {
    if (isOpen) sheet.current?.expand();
    else sheet.current?.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onOpenChange(false);
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, onOpenChange]);

  const renderBackground = useCallback(
    ({ style }: BottomSheetBackgroundProps) => (
      <Animated.View pointerEvents="none" style={[style, styles.background]}>
        <GlassSurface radius={SHEET_RADIUS} blurTarget={blurTarget} />
      </Animated.View>
    ),
    [blurTarget]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={BACKDROP_OPACITY}
        pressBehavior="close"
      />
    ),
    []
  );

  // The grabber and header are Gorhom's handle, so they stay put while the body scrolls.
  const renderHandle = useCallback(
    () => (
      <View>
        <View
          style={[styles.grabber, { backgroundColor: grabberColor }]}
          accessibilityElementsHidden
        />
        <View style={styles.header}>
          <HeaderIconButton
            icon="close"
            label={t("common.cancel")}
            onPress={() => onOpenChange(false)}
          />
          <Text
            accessibilityRole="header"
            className="flex-1 text-center text-body font-bold text-foreground"
            numberOfLines={1}
          >
            {title ?? ""}
          </Text>
          {onConfirm ? (
            <HeaderIconButton
              icon={confirmIcon}
              label={confirmLabel ?? t("common.confirm")}
              tone="fill"
              onPress={onConfirm}
              isDisabled={isConfirmDisabled}
            />
          ) : (
            // Keeps the title centred when there is no confirm button.
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>
    ),
    [grabberColor, t, onOpenChange, title, onConfirm, confirmLabel, confirmIcon, isConfirmDisabled]
  );

  return (
    <BottomSheet
      ref={sheet}
      index={initialIndex}
      detached
      bottomInset={insets.bottom + SHEET_INSET}
      topInset={insets.top + SHEET_INSET}
      style={styles.sheet}
      backgroundComponent={renderBackground}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(index) => {
        if (index === -1 && isOpen) onOpenChange(false);
        if (index >= 0) onShown?.();
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Clipped to its corners, so scrolled content never shows past the sheet's edge.
  sheet: {
    marginHorizontal: SHEET_INSET,
    borderRadius: SHEET_RADIUS,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  background: { borderRadius: SHEET_RADIUS, borderCurve: "continuous", overflow: "hidden" },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Clear of the 42 px corners: the round buttons sit 16 pt from the sheet's edge.
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerSpacer: { width: 36, height: 36 },
  content: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 18, gap: 12 },
});
