import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

/**
 * Notification permission for local reminders and push. Ask from a user action, after
 * `PermissionSheet` has explained why, so the system prompt has context.
 */
export type NotificationPermission = "granted" | "undetermined" | "denied";

/** The Android channel local notifications use (Android 13+ prompts only once one exists). */
export const NOTIFICATION_CHANNEL_ID = "reminders";

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL) {
    return "granted";
  }
  return permission.canAskAgain ? "undetermined" : "denied";
}

/**
 * Creates the Android channel and returns whether it exists. Expo Go on Android rejects creating
 * it (a NullPointerException), so there it is skipped and notifications use the default channel;
 * anywhere else a failure is logged and falls back the same way.
 */
async function ensureChannel(name: string): Promise<boolean> {
  if (Platform.OS !== "android" || isRunningInExpoGo()) return false;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name,
      importance: AndroidImportance.DEFAULT,
    });
    return true;
  } catch (error) {
    console.warn("notifications: could not create the notification channel", error);
    return false;
  }
}

/** Shows the system prompt and returns the result. `channelName` is shown in Android settings. */
export async function requestNotificationPermission(
  channelName: string
): Promise<NotificationPermission> {
  await ensureChannel(channelName);
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.granted) return "granted";
  return permission.canAskAgain ? "undetermined" : "denied";
}

/** This device's permission, read again when the app returns to the foreground (null: reading). */
export function useNotificationPermission(): [
  NotificationPermission | null,
  (permission: NotificationPermission) => void,
] {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    const read = (): void => {
      getNotificationPermission()
        .then(setPermission)
        .catch(() => setPermission(null));
    };
    read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => subscription.remove();
  }, []);
  return [permission, setPermission];
}
