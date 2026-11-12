import { BlurView } from "expo-blur";
import type { ComponentProps, ComponentRef, RefObject } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { GLASS_BLUR_INTENSITY, useGlassPalette } from "@/lib/glass";
import { useReduceTransparency } from "@/lib/reduce-transparency";

/** A style for every layer: static, or animated by Reanimated (the tab bar's radius). */
type LayerStyle = ComponentProps<typeof Animated.View>["style"];

/** Android blurs only from 12 (API 31), and only views inside a `BlurTargetView`. */
const ANDROID_BLUR = Platform.OS === "android" && Number(Platform.Version) >= 31;

export type GlassSurfaceProps = {
  /** A solid colour instead of the neutral glass (the quick-add button uses the accent). */
  fill?: string;
  /** Corner radius; use `shapeStyle` instead when the shape animates. */
  radius?: number;
  /** Shape style applied to every layer, for animated radii (the tab bar). */
  shapeStyle?: LayerStyle;
  /** Android only: the `BlurTargetView` behind this surface. Without it Android uses the fallback. */
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
};

/**
 * The one glass material of the app. Render it as the first child of a
 * positioned container; it fills the container behind its content.
 *
 * - iOS, and Android 12+ with a blur target: the compact header's blur under its 10% wash of the
 *   background, for every glass element including sheets.
 * - `fill`: a solid colour (the quick-add button).
 * - Reduce Transparency, older Android, or no blur target: an opaque tint without blur.
 *
 * Every case gets the same inner rim and outer hairline, so the fallback never looks flatter
 * than glass.
 */
export function GlassSurface({ fill, radius, shapeStyle, blurTarget }: GlassSurfaceProps) {
  const palette = useGlassPalette();
  const reduceTransparency = useReduceTransparency();

  const shape: LayerStyle = [
    { borderCurve: "continuous" },
    radius != null ? { borderRadius: radius } : null,
    shapeStyle,
  ];
  const canBlur = Platform.OS === "ios" || (ANDROID_BLUR && blurTarget != null);
  const { rim, hairline } = palette;

  let material;
  if (fill) {
    material = <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />;
  } else if (!reduceTransparency && canBlur) {
    material = (
      <>
        <BlurView
          tint={palette.colorScheme}
          intensity={GLASS_BLUR_INTENSITY}
          {...(blurTarget ? { blurTarget, blurMethod: "dimezisBlurViewSdk31Plus" as const } : null)}
          style={StyleSheet.absoluteFill}
        />
        {/* Same wash as the compact header, so all glass and the header read as one material. */}
        <View className="absolute inset-0 bg-background opacity-10" />
      </>
    );
  } else {
    material = <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.fallback }]} />;
  }

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { overflow: "hidden" }, shape]}
      >
        {material}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderWidth: StyleSheet.hairlineWidth, borderColor: rim },
          shape,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.hairline,
          { borderWidth: StyleSheet.hairlineWidth, borderColor: hairline },
          shape,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hairline: {
    position: "absolute",
    top: -StyleSheet.hairlineWidth,
    left: -StyleSheet.hairlineWidth,
    right: -StyleSheet.hairlineWidth,
    bottom: -StyleSheet.hairlineWidth,
  },
});
