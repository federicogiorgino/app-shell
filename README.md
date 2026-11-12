# App Shell

A reusable [Expo](https://expo.dev) starter for iOS and Android: the Liquid Glass shell, the design system, a local SQLite database and the shared infrastructure. It is built on
[HeroUI Native](https://heroui.com/docs/native), [Uniwind](https://docs.uniwind.dev) (Tailwind CSS for React
Native) and Expo Router. It runs without a backend; sign-in (Better Auth) is one switch away.

## What's included

- **Shell:** glass tab bar with a round action button, large-title screens with a collapsing glass header and an
  optional hero, fading tab transitions, launch screen, offline pill, root error boundary and a not-found screen.
- **Design system:** HeroUI Native tokens, Inter, the radius and row metrics, `GlassSurface` with a Reduce
  Transparency fallback, `GlassSheet`, the glass toast with Undo, light/dark/system theme and accent colours.
- **Rows and menus:** `SwipeableRow` (swipe right for one action, left for buttons, long swipe to delete, every
  action also an accessibility action) and `useContextMenu` (the iOS-style long-press menu with a lifted row).
- **Components:** settings rows, `Tile`, `ColorChips`, `Calendar`, `ProgressRing`, `EmptyState`, `DataError`,
  `ScreenLoading`, `ErrorScreen`, `FormTextField`, `PermissionSheet`.
- **Local data:** a typed SQLite store (`src/lib/db`) with migrations, Zod-checked record tables, soft delete for
  Undo and live queries that refresh screens when a table changes. Tests run it on real SQL.
- **Server data:** typed `api()` client and React Query with an on-device cache, for when the app has a backend.
- **Auth (optional):** email and password sign-in and sign-up, session in the device keychain, change password and
  delete account. Off by default; `EXPO_PUBLIC_AUTH_ENABLED=1` turns it on.
- **Onboarding:** short first-launch slides, shown once.
- **Settings:** theme, accent colour, language, notification permission and Reduce Transparency.
- **i18n:** English and Italian, with typed keys that follow the device language.
- **Notifications:** permission helpers, push token registration and opening a screen from a notification tap.
- **Quality:** TypeScript strict, ESLint, Prettier and Vitest; Husky runs lint, format and typecheck on commit.
- **Config:** one identity file (`app.identity.json`) drives the app name, URL scheme and package ids; EAS
  profiles for development, staging, preview and production.

A demo shows it all working: a Home list (swipe, long-press, add, Undo), a detail screen with a hero, and a
Components tab. Start with [`docs/getting-started.md`](docs/getting-started.md) (the rules and a full feature
walkthrough); every part is documented in [`docs/`](docs/README.md).

## Start a new app

```bash
pnpm install
pnpm run init --name "My App" --package com.me.myapp   # rewrites app.identity.json
cp .env.example .env.local                             # optional: API URL, sign-in switch
pnpm start
```

Then:

1. Replace the icons and splash image in `assets/images`, and edit the slides in `src/app/onboarding.tsx`.
2. Build your first feature ([`docs/getting-started.md`](docs/getting-started.md)), then remove the demo as described
   in [`docs/demo.md`](docs/demo.md).
3. For sign-in, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AUTH_ENABLED=1`, and set up the server as in
   [`docs/auth-server-setup.md`](docs/auth-server-setup.md). Put the same values in `eas.json` (`build.base.env`): EAS
   only uploads files git tracks, so `.env.local` is not used by cloud builds.
4. Link an EAS project with `pnpm dlx eas-cli init` before your first cloud build.

## Project layout

```
app.identity.json   name, slug, scheme, package ids (edit via `pnpm run init`)
app.config.ts       Expo config built from the identity file
eas.json            build profiles
src/app             routes: (tabs) is the app, item/[id] the demo detail, settings, onboarding, sign-in, ...
src/components      shell, glass and UI components (header, tab bar, rows, menu, sheets, states)
src/features/demo   the demo feature: schema, repository, row, sheet
src/lib             api, db, auth, config, env, i18n, query cache, storage, theme, glass, notifications
```

Conventions: HeroUI components and semantic theme tokens (see `DESIGN.md`), every string through `t()`, nothing
app-specific hardcoded outside `app.identity.json`.

## Scripts

| Command                      | What                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm start`                 | Start Metro (use a dev build; Expo Go shows its own icon and splash)                |
| `pnpm typecheck`             | `tsc --noEmit`. Typed routes are generated when Expo starts, so start it once first |
| `pnpm lint`                  | ESLint                                                                              |
| `pnpm format:check`          | Prettier                                                                            |
| `pnpm test`                  | Vitest                                                                              |
| `pnpm run init --name "..."` | Rename the app                                                                      |

## Build an APK

```bash
pnpm dlx eas-cli build --platform android --profile preview
```

## Not included

- Sync with a server. The record layer is ready for one; see [`docs/database.md`](docs/database.md).
- Forgot-password and email-verification screens. They need a mail provider on the API first.
- CI.
