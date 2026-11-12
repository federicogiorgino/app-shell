import { Ionicons } from "@expo/vector-icons";
import { useNetworkState } from "expo-network";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Small pill at the top of the screen while the device has no internet connection. */
export function OfflineBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const { isConnected, isInternetReachable } = useNetworkState();
  const insets = useSafeAreaInsets();
  const warningForeground = useThemeColor("warning-foreground");

  // `undefined` means "not known yet": only show the banner once we know we are offline.
  const isOffline = isConnected === false || isInternetReachable === false;
  if (!isOffline) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      className="absolute inset-x-0 items-center"
      style={{ top: insets.top + 4, zIndex: 50 }}
    >
      <View className="flex-row items-center gap-1.5 rounded-full bg-warning px-3 py-1.5">
        <Ionicons name="cloud-offline-outline" size={14} color={warningForeground} />
        <Text className="text-xs font-medium text-warning-foreground">{t("offline.banner")}</Text>
      </View>
    </View>
  );
}
