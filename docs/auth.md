# Auth and onboarding

Sign-in (Better Auth) is part of the shell but **off by default**. With it off the app has no accounts and no network: onboarding alone gates the app. The server side is in [auth-server-setup.md](auth-server-setup.md).

## The switch

`EXPO_PUBLIC_AUTH_ENABLED=1` in `.env.local` (and in the EAS profile for builds) turns sign-in on; `EXPO_PUBLIC_API_URL` must then point at the Better Auth server (`env.ts` refuses to start otherwise). The switch is fixed **at build time**: `AuthGateProvider` is `SessionGateProvider` or `LocalGateProvider` depending on `config.authEnabled`, so the unused branch never runs and no auth request is ever made with sign-in off.

## `useAuthGate()`

`src/lib/auth-gate.tsx`. The one source of truth for "which screens may show".

| Field                  | Type                                     | Meaning                                                                               |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `status`               | `"loading" \| "signedIn" \| "signedOut"` | `loading` while the stored session is read. Always `signedOut` with sign-in off       |
| `authEnabled`          | boolean                                  | Sign-in is part of this build                                                         |
| `canEnterApp`          | boolean                                  | Signed in; or, with sign-in off, past onboarding                                      |
| `userId`               | string \| null                           | The signed-in user's id                                                               |
| `hasOnboarded`         | boolean                                  | The first-launch onboarding was finished or skipped                                   |
| `completeOnboarding()` | function                                 | Stores `onboarded = "1"` and updates the gate                                         |
| `signOut()`            | `Promise<{ error: string \| null }>`     | Ends the session; resolves with an error message on failure. A no-op with sign-in off |

`useAuthGate()` throws outside `AuthGateProvider` (mounted in the root layout).

### `SessionGateProvider` (sign-in on)

- Reads the Better Auth session with `authClient.useSession()`. `status` is `signedIn` with a session, `loading` while pending, else `signedOut`.
- When the user is gone (and not pending) it calls `clearQueryCache()`, so the next user never sees cached data.
- Registers a 401 handler with `setUnauthorizedHandler`: any API response of 401 signs the user out, which returns the app to sign-in. Screens do nothing.
- `signOut` maps failures to translated messages (`errors.signOut`, `errors.network`).

### `LocalGateProvider` (sign-in off)

`status` is `signedOut`, `canEnterApp` equals `hasOnboarded`, `userId` is `null`, `signOut` is a no-op.

### Onboarding flag

The `onboarded` device setting (`flags.ts`, SecureStore, `"1"`). It is read synchronously on first render, so there is no flash of the wrong screen.

## What shows when

See the guard table in [architecture.md](architecture.md#the-route-table). In short:

| State                             | Screens                              |
| --------------------------------- | ------------------------------------ |
| First launch                      | `onboarding`                         |
| Onboarded, sign-in off            | The app (`(tabs)`, settings, detail) |
| Onboarded, sign-in on, signed out | `sign-in`                            |
| Signed in                         | The app, plus the account screens    |

The route changes by itself when the gate flips; never navigate by hand after sign-in or sign-out. While `status` is `loading` the stack is not mounted and `LaunchScreen` is shown, so there is no flash of sign-in.

## `authClient`

`src/lib/auth-client.ts`. `createAuthClient` from `better-auth/react` with the `expoClient` plugin: the session cookie is kept in the device keychain (`expo-secure-store`, key prefix = the app slug) and the URL scheme comes from `config.scheme`, which must be in the server's `TRUSTED_ORIGINS`. The base URL is `config.apiUrl`; with sign-in off a placeholder `http://localhost` is used and never requested. `api()` reads the cookie with `authClient.getCookie()` and sends it by hand.

Calls used by the screens: `signIn.email`, `signUp.email`, `signOut`, `useSession`, `changePassword`, `deleteUser`.

### Reading the user and signing out

```tsx
const { data: session } = authClient.useSession(); // only when authEnabled
session?.user.name; // also id, email

const { signOut } = useAuthGate();
const { error } = await signOut(); // never throws; error is a message or null
```

Gate UI on `canEnterApp` and `authEnabled`, not on `status`. Only call `authClient` when sign-in is on.

### Sign-out and shared devices

Sign-out clears the query cache. The local database is **kept** on sign-out and wiped after Delete Account. If several people can share a device, call `wipeLocalDatabase()` on sign-out too.

After changing `EXPO_PUBLIC_AUTH_ENABLED`, restart Expo with a cleared cache (`pnpm start --clear`).

To see onboarding again during development, clear the app's data (or reinstall).

## Screens

### Onboarding (`onboarding.tsx`)

Three full-width paged slides (horizontal `ScrollView`, `pagingEnabled`): a soft-accent circle with an icon, a heading and a muted paragraph. Page dots (the active one is an elongated accent pill), a Skip button (hidden on the last slide) and a primary button (Next, then Get started). Skip and Get started call `completeOnboarding()`. The slide content is the `SLIDES` array (icon and i18n keys under `onboarding.*`); change the array and the strings to change the story. The page dots expose "Page n of m" to screen readers.

### Sign in and sign up (`sign-in.tsx`)

One form with two modes sharing one shape. Sign-in validates email and a non-empty password (existing accounts may predate the length rule); sign-up validates name, email and a password of at least `MIN_PASSWORD_LENGTH` (10). Fields use `FormTextField`; Return moves name, email, password and then submits. A `USER_ALREADY_EXISTS` error is shown on the email field (`auth.emailTaken`); any other failure appears in a danger `Alert` above the form; in development builds the network error also shows the cause. The submit button shows a spinner and a "Please wait" label while submitting; a ghost button toggles the mode. The layout uses a `KeyboardAvoidingView` with `behavior="padding"` on both platforms. On success nothing is called: the session updates and the stack swaps.

### Account (`(settings)/account.tsx`)

A section with the user (name and email), Change password, then a danger section with Sign out (shows a spinner and ignores presses while running; a failure shows an `Alert`) and Delete account. Registered only when sign-in is on.

### Change password (`change-password.tsx`)

Current, new and confirm fields; the confirm must match; validates on change and disables submit until valid. Calls `changePassword` with `revokeOtherSessions: true`, shows a success toast and goes back.

### Delete account (`delete-account.tsx`)

Asks for the password, then a destructive `useConfirm`. It calls `authClient.deleteUser({ password })` (the server needs `user.deleteUser.enabled`), then `wipeLocalDatabase()` (a failure is logged, not fatal), then `signOut()`, which returns the app to sign-in. The local data therefore never outlives the account.

### Not found (`+not-found.tsx`)

`ErrorScreen` with a Go home action (`router.replace("/")`).

## Not included

Forgot-password, email verification and social sign-in. They need support on the server first (a mail provider for the first two, provider keys for social); Better Auth has client methods for each once the server is ready.

## Adding auth features

Add the Better Auth plugin on the server, expose its client in `authClient` (`plugins`), build the screen with `FormTextField` and `setFormError`, register it inside the `canEnterApp && authEnabled` guard in `_layout.tsx`, and add strings in every language. Social sign-in and email verification need extra server and redirect setup; see [../auth-api-setup.md](auth-server-setup.md).

## Removing auth completely

Delete `src/lib/auth-client.ts`, `sign-in.tsx`, `change-password.tsx`, `delete-account.tsx`, `(settings)/account.tsx`, the `AccountSection` in `settings.tsx`, the `SessionGateProvider` branch, the `auth`, `account`, `changePassword`, `deleteAccount` i18n groups, and the `better-auth` and `@better-auth/expo` dependencies. `api()` reads the cookie from `authClient`; remove that line if you keep `api()`.
