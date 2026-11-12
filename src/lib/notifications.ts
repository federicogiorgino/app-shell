import Constants from "expo-constants";
import * as Device from "expo-device";
import { useRouter, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

// Show notifications that arrive while the app is open instead of silently dropping them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushRegistration =
  { status: "granted"; token: string } | { status: "denied" | "unavailable" };

/**
 * Asks for notification permission and returns the Expo push token. Call it from a user action
 * (for example enabling reminders), not at launch, so the system prompt has context. Send the
 * token to your API to target this device. Needs a physical device and an EAS project id.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (!Device.isDevice) return { status: "unavailable" };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { status: "unavailable" };

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: "granted", token: data };
}

/** Only in-app paths are followed, so a crafted payload cannot open an arbitrary URL. */
function internalPath(data: unknown): string | null {
  const url = data && typeof data === "object" ? (data as { url?: unknown }).url : null;
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

/**
 * Opens the screen named by a tapped notification's `data.url` (for example `{ "url": "/details" }`),
 * including when the tap is what launched the app. Mount it once in the root layout.
 */
export function useNotificationRouting(): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const path = internalPath(response.notification.request.content.data);
    if (path) router.push(path as Href);
  }, [response, router]);
}
