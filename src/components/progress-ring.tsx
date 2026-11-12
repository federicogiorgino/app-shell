import { useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const SIZE = 60;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2 - 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A 60 px ring with a percentage in the middle. The
 * percentage is the accessible value; the ring itself is decorative.
 */
export function ProgressRing({
  fraction,
  accessibilityLabel,
}: {
  /** 0 to 1. */
  fraction: number;
  accessibilityLabel: string;
}): JSX.Element {
  const [track, accent, success] = useThemeColor(["surface-secondary", "accent", "success"]);
  const clamped = Math.min(1, Math.max(0, fraction));
  const percent = Math.round(clamped * 100);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ width: SIZE, height: SIZE }}
      className="items-center justify-center"
    >
      <Svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={track}
          strokeWidth={STROKE}
        />
        {clamped > 0 ? (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            // Green once everything is done.
            stroke={clamped >= 1 ? success : accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          />
        ) : null}
      </Svg>
      <Text
        className="text-caption font-semibold text-foreground"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {percent}%
      </Text>
    </View>
  );
}
