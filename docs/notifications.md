# Notifications

`src/lib/notification-permission.ts`, `src/lib/notifications.ts`, `src/components/permission-sheet.tsx`. Permission handling for local reminders and push, plus opening a screen from a tapped notification. The push setup walkthrough (EAS project, tokens) is in [../environments-and-builds.md](builds-and-tooling.md).

## The flow

Ask from a user action, after explaining why, never at launch:

1. A settings row (or a feature) shows the current state (`useNotificationPermission`).
2. Tapping it opens `PermissionSheet`, which explains the benefit.
3. **Allow** calls `requestNotificationPermission(channelName)`; the result updates the row and shows a toast.
4. **Not now** (or dismissing the sheet) leaves the feature off.
5. If the permission was denied, the row opens the system settings instead (`Linking.openSettings()`), because the system prompt cannot be shown again.

`settings.tsx` and the Components tab both implement it; copy from there.

## `notification-permission.ts`

| Export                                       | Meaning                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NotificationPermission`                     | `"granted" \| "undetermined" \| "denied"`                                                                                                                                                                      |
| `NOTIFICATION_CHANNEL_ID`                    | `"reminders"`, the Android channel local notifications use                                                                                                                                                     |
| `getNotificationPermission()`                | Reads the current permission. iOS provisional counts as granted. Not granted and the system can still ask: `undetermined`; otherwise `denied`                                                                  |
| `requestNotificationPermission(channelName)` | Creates the Android channel (Android 13+ prompts only once one exists), shows the system prompt and returns the result                                                                                         |
| `useNotificationPermission()`                | `[permission \| null, setPermission]`: this device's permission, read on mount and **again whenever the app returns to the foreground** (so changing it in system settings is picked up). `null` while reading |

`ensureChannel` skips channel creation in Expo Go on Android (it throws a NullPointerException there) and logs and falls back to the default channel if creation fails anywhere else.

## `PermissionSheet`

See [glass.md](glass.md#permissionsheet). Props: `isOpen`, `onAllow`, `onNotNow`, `icon`, `title`, `message`, `blurTarget`. Defaults are the notification texts; pass your own `icon`, `title` and `message` to ask for another permission (camera, location, Health) the same way.

## `notifications.ts`

### Foreground handler

Importing the module sets `Notifications.setNotificationHandler` so a notification that arrives while the app is open is shown as a banner and in the list, with no sound and no badge.

### `registerForPushNotifications()`

Asks for permission and returns the Expo push token. Call it from a user action. Returns:

| Result                         | When                                        |
| ------------------------------ | ------------------------------------------- |
| `{ status: "granted", token }` | Permission granted and a token was issued   |
| `{ status: "denied" }`         | The user refused                            |
| `{ status: "unavailable" }`    | Not a physical device, or no EAS project id |

On Android it first creates a `default` channel. The project id comes from `extra.eas.projectId` (set from `app.identity.json`'s `easProjectId`) or `easConfig`. Send the token to your own API; the shell has no endpoint for it.

### `useNotificationRouting()`

Mounted once in `RootStack`. When the user taps a notification (the default action) it reads `data.url` and pushes it with the router, including when the tap launched the app. **Only in-app paths are followed**: the URL must start with a single `/` (not `//`), so a crafted payload cannot open an arbitrary URL.

```json
{ "to": "<token>", "title": "Reminder", "body": "Take your dose", "data": { "url": "/item/abc" } }
```

## Local reminders

Local notifications are not push: ask with `requestNotificationPermission`, then schedule with `expo-notifications` (`scheduleNotificationAsync`, a trigger, and `channelId: NOTIFICATION_CHANNEL_ID` on Android). They work in Expo Go and need no EAS project. Put the notification's `data.url` on it to deep-link on tap.

## Strings

`permission.*`: `notificationsTitle`, `notificationsMessage`, `allow`, `notNow`, `channel` (the Android channel name, "Reminders"), `rowTitle`, `statusGranted` ("On"), `statusDenied` ("Off"), `statusNotAsked` ("Not set"), `granted`, `declined`.

## Native note

`expo-notifications` is a native module included in the dev client. A change to its plugin config needs a new development build.
