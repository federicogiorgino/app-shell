# Architecture

How the shell starts, what wraps what, and how a screen ends up on the display. Read it after [getting-started.md](getting-started.md); every other page assumes it.

## Folder map

```
app.config.ts          the one Expo config (reads app.identity.json and APP_ENV)
app.identity.json      name, slug, URL scheme, bundle ids, EAS project id
assets/                icon, adaptive icon, splash images (placeholder artwork: replace it)
docs/                  this documentation (start at docs/README.md)
scripts/init.mjs       `pnpm run init`: renames the app (see builds-and-tooling.md)
src/app/               routes (Expo Router, file based)
src/components/        shared UI: header, glass tab bar, sheets, rows, states
src/features/demo/     the demo feature: schema, repository, rows, sheet (delete or replace)
src/lib/               everything non-visual: db, api, auth, i18n, theme, storage, hooks
src/global.css         Tailwind v4 + Uniwind + HeroUI entry, and the app's tokens
src/heroui-overrides.css  the few HeroUI component overrides (list rows, menu)
```

Rule of thumb: `src/lib` and `src/components` never import from `src/features`. A feature imports from them. That is what makes the shell reusable: delete `src/features/demo` and the shell still compiles once the routes that import it are removed.

## Start-up sequence

`src/app/_layout.tsx` runs, in this order:

1. `react-native-gesture-handler` is imported first (a library requirement).
2. `../lib/i18n` initialises i18next as a side effect of the import (language from the stored choice, else the device).
3. `applyStoredThemePreference()` and `applyStoredAccent()` read two device settings synchronously and apply them before the first frame, so there is no light/dark or accent flash.
4. `SplashScreen.preventAutoHideAsync()` keeps the native splash up.
5. `RootLayout` waits for the fonts (Inter 400/500/600/700) and `useLocalStore()` (the SQLite database opened and migrated). A font error does not block: the system font is used. While waiting it renders nothing, so the splash stays.
6. Once both are ready it mounts the provider tree below. `RootStack` then hides the native splash; `LaunchScreen` (same mark, same colour) covers the gap until the auth gate has read the stored session (`status !== "loading"`).

If the database cannot be opened, `useLocalStore` throws a `LocalStoreError`; the root `ErrorBoundary` shows `DataError` (layout `screen`) with Try Again. Any other render error shows `ErrorScreen` (the real message only in `__DEV__`).

## Provider tree

```
GestureHandlerRootView
└─ HeroUINativeProvider                 HeroUI portals, toasts, theme variables
   └─ GlassToastProvider                the app's toast, over every screen
      └─ QueryProvider                  TanStack Query with the on-device cache
         └─ AuthGateProvider            useAuthGate(): which screens may show
            └─ ConfirmProvider          useConfirm(), useConfirmDelete()
               └─ RootStack             the Expo Router Stack + OfflineBanner + StatusBar
                  └─ (tabs)/_layout     adds, around the tabs:
                     TabBarMinimizeProvider
                     └─ GlassToastProvider      a second toast, above the tab bar
                        └─ ItemSheetProvider    demo add/edit sheet
                           └─ ContextMenuProvider
                              └─ SheetProvider  useSheet(): sheets above the tab bar
                                 └─ Tabs (BlurTargetView + TabSlot, AppTabBar)
```

Why the tabs layout has its own providers: the toast, the context menu and the sheets are drawn **in place**, after the tabs in the same view tree, not in a portal. That is what puts them above the glass tab bar and lets their glass blur the same screen content the tab bar blurs (`blurTarget`). Anything rendered inside a tab screen is drawn under the tab bar.

## The route table

`RootStack` is an Expo Router `Stack` with `headerShown: false` (every screen draws its own header with `LargeTitleScreen`). Screens are grouped by `Stack.Protected` guards, so a route that is not allowed does not exist:

| Guard                                         | Routes                                                                                            | When it is true                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `canEnterApp`                                 | `(tabs)`, `settings`, `item/[id]`, `(settings)/theme`, `(settings)/accent`, `(settings)/language` | Sign-in off: after onboarding. Sign-in on: signed in. |
| `canEnterApp && authEnabled`                  | `(settings)/account`, `change-password`, `delete-account`                                         | Sign-in on and signed in                              |
| `!canEnterApp && !hasOnboarded`               | `onboarding`                                                                                      | First launch                                          |
| `authEnabled && !canEnterApp && hasOnboarded` | `sign-in`                                                                                         | Sign-in on, signed out, past onboarding               |

When a guard flips (finishing onboarding, signing out), Expo Router moves to the first available route by itself. You never call `router.replace` after sign-in or sign-out. `+not-found.tsx` is the unmatched-route screen.

Every pushed screen outside `(tabs)` must be listed in the right group in `_layout.tsx`, or it is unreachable. A new tab goes in the `ITEMS` array of `(tabs)/_layout.tsx` (see [tab-bar.md](tab-bar.md)).

Typed routes are on (`experiments.typedRoutes`); `.expo/types` is generated when Expo starts, and `pnpm typecheck` needs it.

## Adding screens

**A tab:** create `src/app/(tabs)/<name>.tsx` and add an entry to `ITEMS` in `src/app/(tabs)/_layout.tsx` ([tab-bar.md](tab-bar.md)).

**A pushed screen** (opens over the tabs, gets a back button automatically):

1. Create `src/app/<name>.tsx` and wrap it in `LargeTitleScreen`.
2. Register it inside the `canEnterApp` group in `_layout.tsx`: `<Stack.Screen name="<name>" />`.
3. Navigate with the typed router:

   ```tsx
   const router = useRouter();
   router.push("/<name>");
   router.push({ pathname: "/notes/[id]", params: { id: "42" } });
   router.back();
   ```

**A route with a parameter:** `src/app/notes/[id].tsx`, registered as `notes/[id]`, read with `useLocalSearchParams<{ id: string }>()`.

**A modal:** `<Stack.Screen name="compose" options={{ presentation: "modal" }} />`; put a close `HeaderIconButton` in `rightContent`.

**A screen that needs an account:** register it in the `canEnterApp && authEnabled` group.

## Deep links

`<scheme>://notes/42` opens the matching route with no extra code, because Expo Router maps URLs to files (the scheme is in `app.identity.json`). Test one:

```bash
pnpm dlx uri-scheme open "appshell://settings" --android
pnpm dlx uri-scheme open "appshell://settings" --ios
```

Web links (`https://example.com/notes/42` opening the app) need `associatedDomains` (iOS) and `intentFilters` (Android) in `app.config.ts`, plus a hosted association file on the domain.

## Navigation theme and system UI

`RootStack` builds a React Navigation theme from the HeroUI tokens (`background`, `foreground`, `accent`, `border`) on top of `DefaultTheme` or `DarkTheme`, so the native stack's own surfaces match the app. It also sets `SystemUI` background colour (the colour visible behind transitions) and the `StatusBar` style from the active theme.

## Notification routing

`useNotificationRouting()` (in `RootStack`) opens the route carried by a tapped notification. See [notifications.md](notifications.md).

## Build-time switches

| Switch                       | Where                     | Effect                                                                                                   |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_AUTH_ENABLED=1` | `.env.local`, EAS profile | Sign-in (Better Auth) is required. Chooses `SessionGateProvider` over `LocalGateProvider` at build time. |
| `EXPO_PUBLIC_API_URL`        | `.env.local`              | Base URL for `api()` and Better Auth. Required when sign-in is on.                                       |
| `APP_ENV`                    | `eas.json` profile        | `development`, `staging`, `production`: suffixes the bundle id and name so builds install side by side.  |

Details: [api-and-storage.md](api-and-storage.md), [auth.md](auth.md).

## Experiments in `app.config.ts`

- `reactCompiler: true`: React Compiler is on. Do not wrap components in `memo` or add `useMemo` for performance; write plain components. (Lint also enforces hook rules such as `react-hooks/refs`: no ref reads during render.)
- `typedRoutes: true`.
- `predictiveBackGestureEnabled: false` on Android.
- Plugins: `expo-router`, `expo-font`, `expo-splash-screen` (light `#f2f2f7`, dark `#000000`, mark 92 pt wide), `expo-status-bar`, `expo-secure-store`, `expo-sqlite`, `expo-web-browser`, `expo-notifications`.
