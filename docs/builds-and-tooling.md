# Tooling, scripts and build

The project plumbing: package manager, scripts, checks, tests, the rename script, build profiles and the files that configure them.

## Package manager: pnpm

pnpm 12 (`"packageManager": "pnpm@12.18.0"`). (On Windows with Smart App Control, Bun's `.exe` launchers are blocked; pnpm's are not.)

```bash
pnpm install              # install; also runs `prepare` (installs the Husky hooks)
pnpm add <pkg>            # dependency
pnpm add -D <pkg>         # dev dependency
pnpm remove <pkg>
pnpm dlx <pkg>            # run a package once (replaces bunx / npx)
pnpm exec <bin>           # run an installed binary
```

`pnpm-workspace.yaml` sets `nodeLinker: hoisted`: React Native and Expo resolve native modules from a flat `node_modules`. pnpm 12 ignores `.npmrc` for this, so the setting lives in the workspace file. Do not mix npm, yarn, Bun and pnpm; keep `pnpm-lock.yaml`. Check Expo SDK compatibility (`npx expo install` versions, the `~` ranges in `package.json`) before adding a native package; a native module needs a **new dev client build**.

## Scripts (`package.json`)

| Script                             | Runs                               | Use                                                                                                                             |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm start`                       | `expo start`                       | Metro; use a dev build (Expo Go shows its own icon and splash). Generates `.expo/types` and `uniwind-types.d.ts`                |
| `pnpm android`, `pnpm ios`         | `expo start --android/--ios`       | Open on a device or simulator                                                                                                   |
| `pnpm typecheck`                   | `tsc --noEmit`                     | Strict TypeScript; needs the generated types, so start Expo once first                                                          |
| `pnpm lint`, `pnpm lint:fix`       | `eslint .`                         | ESLint with `eslint-config-expo` (flat config in `eslint.config.js`; React Compiler and hooks rules such as `react-hooks/refs`) |
| `pnpm format`, `pnpm format:check` | `prettier --write .` / `--check .` | Prettier: double quotes, semicolons, `es5` trailing commas, width 100, LF (`.prettierrc.json`)                                  |
| `pnpm test`, `pnpm test:watch`     | `vitest run` / `vitest`            | Unit tests                                                                                                                      |
| `pnpm run init --name "..."`       | `node scripts/init.mjs`            | Rename the app                                                                                                                  |
| `prepare`                          | `husky`                            | Installs the git hooks                                                                                                          |

Run before committing: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`.

## Pre-commit hook

`.husky/pre-commit` runs `pnpm exec lint-staged` then `pnpm exec tsc --noEmit`. `lint-staged` (configured in `package.json`) runs `eslint --fix --no-warn-ignored` then `prettier --write` on staged `ts/tsx/js/jsx` files, and `prettier --write` on staged `json/md/mdx/css/mjs/yml/yaml` files. A commit is blocked if lint errors remain or the project does not typecheck. Bypass in an emergency with `git commit --no-verify`, then fix it.

## TypeScript (`tsconfig.json`)

Extends `expo/tsconfig.base`, `strict: true`. Path aliases: `@/*` → `./src/*` and `@/assets/*` → `./assets/*`. Includes `.expo/types` (typed routes), `expo-env.d.ts` and `uniwind-env.d.ts`. `@types/node` is installed for the test database. Use `@/…` imports across folders; relative imports for siblings.

## Tests (Vitest)

`vitest.config.mts` (an `.mts` file so ESM loads cleanly): `environment: "node"`, includes `src/**/*.test.ts`, aliases `@` to `src`. Only plain TypeScript is tested: no React Native renderer. Database tests run against real SQL through Node's built-in `node:sqlite` (`src/lib/db/test-db.ts`).

Existing tests: `dates.test.ts` (calendar arithmetic, ranges, DST), `ids.test.ts` (UUID v7 ordering and bits), `schemas.test.ts` (email and password rules), `features/demo/repository.test.ts` (CRUD, Undo, notifications, wipe). Put new logic that needs no React Native in plain modules so it can be tested the same way.

## Metro (`metro.config.js`)

`getDefaultConfig(__dirname)` wrapped in `withUniwindConfig(config, { cssEntryFile: "./src/global.css" })`.

## `scripts/init.mjs`: rename the app

```bash
pnpm run init --name "My App" [--slug my-app] [--scheme myapp] [--package com.me.myapp]
```

Rewrites `app.identity.json`. Defaults: `slug` = kebab-case name; `scheme` = slug without dashes; `package` = `com.example.<scheme>`; `iosBundleIdentifier` = the package. Validates each (slug: lowercase letters, digits, dashes; scheme: lowercase letters and digits; package: reverse-domain). It clears `easProjectId`, since a renamed app is a different EAS project. Afterwards: add `<scheme>://` to the API's `TRUSTED_ORIGINS` if sign-in is on, set `EXPO_PUBLIC_API_URL` if there is a backend, run `pnpm dlx eas-cli init`, and replace the icons in `assets/images` (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `splash-icon-dark.png`; they are placeholders).

Storage keys use the slug (`<slug>.theme`), so renaming the slug **after release** resets users' device settings. Choose it once.

## Environments and builds

`eas.json`: `cli.appVersionSource: "local"`; `build.base.env` sets `EXPO_PUBLIC_API_URL` (empty) and `EXPO_PUBLIC_AUTH_ENABLED` (`0`) for every profile.

| Profile       | Extends | Distribution         | `APP_ENV`     | Android    |
| ------------- | ------- | -------------------- | ------------- | ---------- |
| `development` | base    | internal, dev client | `development` | apk        |
| `preview`     | base    | internal             | (production)  | apk        |
| `staging`     | base    | internal             | `staging`     | apk        |
| `production`  | base    | store                | `production`  | app-bundle |

`APP_ENV` (read by `app.config.ts`) suffixes the name (` (Dev)`, ` (Staging)`) and the bundle id and package (`.dev`, `.staging`), so development and staging builds install beside the production app. The URL scheme stays the same so the API needs one trusted origin.

EAS uploads only files git tracks, so **`.env.local` is not used by cloud builds**: put `EXPO_PUBLIC_*` values in `eas.json` (`build.base.env` or a profile). Build an APK: `pnpm dlx eas-cli build --platform android --profile preview`. Link a project before the first cloud build: `pnpm dlx eas-cli init`.

To point staging at a staging API, add the value to that profile:

```json
"staging": {
  "extends": "base",
  "env": { "APP_ENV": "staging", "EXPO_PUBLIC_API_URL": "https://staging-api.example.com" }
}
```

Or create EAS environment variables: `pnpm dlx eas-cli env:create --name EXPO_PUBLIC_API_URL --value "https://api.example.com" --environment production --visibility plaintext`. Read the environment in code with `config.appEnv`.

Common commands:

```bash
pnpm dlx eas-cli build --platform android --profile development   # dev client
pnpm dlx eas-cli build --platform android --profile preview       # shareable APK
pnpm dlx eas-cli build --platform all --profile production
```

### When to rebuild the dev client

After adding or upgrading a native module, changing plugins or the Expo config's native parts (name, scheme, package ids, permissions, splash). JavaScript and asset changes reload without a rebuild. Changing the app id installs it as a different app.

## Repository files

| File                                  | Purpose                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` | Instructions and the visual contract for AI coding agents (and a good read for humans): conventions, the HeroUI docs index, the design tokens |
| `docs/heroui-native/`                 | The HeroUI Native docs (MDX), indexed in `AGENTS.md`; read a component's page before using it                                                 |
| `.claude/skills/`                     | The HeroUI Native skill for agents                                                                                                            |
| `.env.example`                        | Documents `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AUTH_ENABLED`; copy to `.env.local`                                                          |
| `.gitignore`                          | Ignores `node_modules`, `.expo`, `dist`, generated `uniwind-types.d.ts` and `expo-env.d.ts`, signing files, debug logs                        |
| `.gitattributes`, `.prettierignore`   | Line endings and files Prettier skips                                                                                                         |
| `assets/`                             | App icons and splash images                                                                                                                   |

## Troubleshooting

| Symptom                                          | Likely cause                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Invalid environment:` at launch                 | A bad `EXPO_PUBLIC_*` value, or sign-in on without an API URL (see `.env.example`)         |
| `The Expo config has no scheme`                  | `app.identity.json` is missing `scheme`                                                    |
| Typecheck says route types are missing           | Run `pnpm start` once to generate `.expo/types`                                            |
| Classes do nothing or types for `className` fail | `uniwind-types.d.ts` not generated yet; start Expo                                         |
| Glass looks flat on Android                      | No `blurTarget` passed, Android older than 12, or Reduce Transparency is on                |
| A sheet opens under the tab bar                  | It was rendered inside a tab screen; open it with `useSheet()`                             |
| A HeroUI menu looks empty                        | Missing `width` on `Menu.Content` (use `MENU_WIDTH`)                                       |
| `useX must be used inside ...Provider`           | The component is outside that provider; see the tree in [architecture.md](architecture.md) |
