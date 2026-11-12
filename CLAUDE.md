# CLAUDE.md

@AGENTS.md
@DESIGN.md
@docs/README.md

# 1. Project

App Shell is a reusable Expo React Native starter (TypeScript). It holds a Liquid Glass shell (glass tab bar, collapsing large-title header, sheets, toast, long-press menu), a design system on HeroUI Native, a local SQLite database, settings, onboarding, translations, notifications and an optional sign-in, plus a small demo to copy from. New apps start here and rename it with `pnpm run init`. It runs without a backend.

Start with `docs/getting-started.md` (the rules and a full feature walkthrough). Before working in an area, read its page in `docs/` (index imported above).

# 2. Stack

Expo SDK 58, React Native 0.88, React 19 (React Compiler on), TypeScript strict, Expo Router (typed routes), HeroUI Native 1.x, Uniwind with Tailwind CSS v4, Reanimated 4, Gesture Handler, Gorhom Bottom Sheet, expo-blur, expo-sqlite, TanStack Query (persisted), Zod, react-hook-form, i18next (English, Italian), Better Auth (behind `EXPO_PUBLIC_AUTH_ENABLED`, off by default), expo-notifications, SecureStore and AsyncStorage, Vitest (with `node:sqlite`), Husky and lint-staged, pnpm.

Inspect `package.json` and the installed types before assuming a dependency or an API exists.

# 3. Rules

1. Screens read the local database (`useLiveQuery`) or React Query and never wait for the network. Writes go through a feature's repository; no SQL and no `fetch` in screens.
2. Every screen with a header is a `LargeTitleScreen`. No custom headers, no native stack header.
3. Overlays that must sit above the tab bar render in `(tabs)/_layout.tsx` after the tabs, with its `blurTarget`. From a tab screen, open sheets with `useSheet()`.
4. Colours are semantic tokens. Only data colours (picked by the user for a record) may be applied with `style`. Status colours (`success`, `warning`, `danger`) only for their meaning.
5. Every user-visible string, including accessibility labels, goes through `t()` and exists in every language file.
6. Reuse the shell's components and HeroUI Native before writing new ones. Never invent HeroUI props: read the component's page in `docs/heroui-native` (index in `AGENTS.md`) or use the HeroUI MCP.
7. Every gesture has an accessibility equivalent; keep roles, labels, states, safe areas, font scaling, Reduce Motion and Reduce Transparency working.
8. Use Uniwind classes (not NativeWind); `style` only where a component or library requires it.
9. `src/lib` and `src/components` never import from `src/features`.

# 4. Use these, not your own

| Task | Use | Do not |
| --- | --- | --- |
| Screen with a header | `LargeTitleScreen` (`src/components/large-title-screen.tsx`) | build a header or use the native header |
| A new tab | a route in `src/app/(tabs)` and an entry in `ITEMS` (`(tabs)/_layout.tsx`) | add a second tab bar |
| A pushed screen | a route registered in `src/app/_layout.tsx` inside the `canEnterApp` `Stack.Protected` group (account screens: the `canEnterApp && authEnabled` group) | navigate after sign-in or sign-out by hand |
| Data kept on the device | a migration in `src/lib/db/migrations.ts` (append only), a `RecordTable` in the feature's `schema.ts`, a repository using `writeTransaction`, `useLiveQuery` in screens | write SQL in screens or poll |
| Call a server | `api()` (`src/lib/api.ts`) with a Zod schema, inside TanStack Query hooks | call `fetch` or keep fetched data in `useState` |
| A list row with swipes or a long-press menu | `SwipeableRow`, `useContextMenu` | build gesture rows per screen |
| Settings-style rows and pickers | `SettingsSection` around the `SettingsRow` family | hand-build `ListGroup.Item`s or add `Separator`s |
| A sheet, an action list | `GlassSheet`, `ActionSheet`, opened with `useSheet()` inside the tabs | render a sheet inside a tab screen |
| An outcome, an Undo | `useNotify()`, `useGlassToast({ onUndo })` | `Alert.alert` |
| Ask before a destructive action | `useConfirmDelete()` or `useConfirm({ destructive: true })` | `Alert.alert` |
| Loading, empty, error, offline | `ScreenLoading`, `EmptyState`, `DataError`, `ErrorScreen`, `OfflineBanner` | one-off versions or skeletons |
| Forms | a Zod schema built from `t`, `zodResolver`, `FormTextField`; shared rules in `src/lib/schemas.ts` | inline validation |
| Ask for a permission | `PermissionSheet`, then `requestNotificationPermission` | the system prompt with no context |
| Config and env | `config` (`src/lib/config.ts`), `env` (`src/lib/env.ts`); new variables declared in `env.ts` and `.env.example` | `process.env` or hardcoded names, URLs, ids; secrets in `EXPO_PUBLIC_*` |
| Small device settings | `readSetting` / `writeSetting` (`src/lib/flags.ts`) | AsyncStorage for values needed on first render |
| Larger non-secret data | `readJSON` / `writeJSON` (`src/lib/storage.ts`) | secrets there |
| Theme, accent | `theme-preference.ts`, `accent-preference.ts`, tokens | hardcoded colours |
| Sign-in state | `useAuthGate()` (`canEnterApp`, `authEnabled`), `authClient` only when sign-in is on | gate on `status` |

Also: mark sensitive queries `meta: { persist: false }`; a native module needs a new dev client build (say so when adding one); pure logic goes in plain TypeScript with a Vitest test next to it.

# 5. Workflow

1. **Understand:** read the docs page for the area, the existing code and the demo's equivalent (`src/features/demo`, `src/app/item/[id].tsx`, `src/app/(tabs)/components.tsx`).
2. **Plan:** for anything larger than a small change, list the files, reused components, new components, states (loading, error, empty, success), strings and new dependencies, and explain it before changing architecture.
3. **Implement:** follow the rules above and `DESIGN.md`.
4. **Validate:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (when logic changed), `pnpm format:check`. Never claim a check ran if it did not, and never hide an error. Say what was not verified on a device.
5. **Document:** update the matching page in `docs/` in the same change.

When sources disagree: the installed packages and their types win, then the HeroUI Native docs, then `DESIGN.md`, then these rules and `docs/`.

# 6. Package management

pnpm only (`pnpm add`, `pnpm add -D`, `pnpm remove`, `pnpm exec`, `pnpm dlx`; Expo packages with `pnpm exec expo install`). `pnpm-workspace.yaml` sets `nodeLinker: hoisted` (the flat `node_modules` React Native needs). Never mix npm, yarn, Bun and pnpm. Keep the lockfile. Check Expo SDK compatibility before adding a package.

First run: `pnpm install`, optionally copy `.env.example` to `.env.local`, `pnpm start` (it also generates the route and class types typecheck needs). Rename: `pnpm run init --name "My App"`.

# 7. The demo

`src/features/demo`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/components.tsx` and `src/app/item/[id].tsx` show every pattern working together. Copy from them; remove them as described in `docs/demo.md` when a real feature replaces them.
