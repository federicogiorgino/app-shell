import { useWindowDimensions } from "react-native";

/** From this system font scale on, the layout switches to Larger Text. */
export const LARGER_TEXT_SCALE = 1.3;

/**
 * True when the system text size is large enough that one-line titles should wrap instead of
 * being cut off. The in-app switch was dropped: this follows the
 * system setting only, and updates when it changes.
 */
export function useLargerText(): boolean {
  return useWindowDimensions().fontScale >= LARGER_TEXT_SCALE;
}
