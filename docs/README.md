# Documentation

One page per part of the shell. Each page says what exists (props, defaults, behaviour), how to use it, and the rules. New here? Read [getting-started.md](getting-started.md), then [architecture.md](architecture.md).

## Pages

| Page                                             | Covers                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [getting-started.md](getting-started.md)         | What the shell is, the seven rules, first run, renaming, building a feature end to end, removing the demo                |
| [architecture.md](architecture.md)               | Folder map, start-up, provider tree, route guards, adding screens, deep links, build switches                            |
| [header.md](header.md)                           | `LargeTitleScreen`, `HeaderIconButton`, back button, collapse, hero, virtualized lists, tuning                           |
| [tab-bar.md](tab-bar.md)                         | `GlassTabBar`, adding a tab, the action button, minimize on scroll, tuning                                               |
| [glass.md](glass.md)                             | `GlassSurface`, `GlassSheet`, `useSheet`, `ActionSheet`, `PermissionSheet`, the glass toast, the long-press context menu |
| [lists-and-gestures.md](lists-and-gestures.md)   | `SwipeableRow`, swipe and long-press actions, lists, HeroUI `Menu`                                                       |
| [settings.md](settings.md)                       | `SettingsRow` and its wrappers, separators, `Tile`, the Settings and picker screens, adding a setting                    |
| [feedback-and-states.md](feedback-and-states.md) | `useNotify`, confirmations, empty, error, loading, offline and launch states                                             |
| [forms.md](forms.md)                             | `FormTextField`, the form recipe, forms in sheets                                                                        |
| [widgets.md](widgets.md)                         | `Calendar`, `ProgressRing`, `ColorChips`, `FieldLabel`, the HeroUI parts in use                                          |
| [database.md](database.md)                       | SQLite: migrations, record tables, repositories, soft delete and Undo, live queries, tests, adding a sync                |
| [api-and-storage.md](api-and-storage.md)         | `env`, `config`, `api()`, React Query, device storage, ids, dates, small hooks                                           |
| [theming.md](theming.md)                         | Tokens, type scale, HeroUI overrides, metrics, theme, accent, Reduce Transparency, Larger Text, motion                   |
| [i18n.md](i18n.md)                               | Typed translations, the language preference, adding strings and languages                                                |
| [auth.md](auth.md)                               | The sign-in switch, `useAuthGate`, onboarding, sign-in and account screens                                               |
| [auth-server-setup.md](auth-server-setup.md)     | The Better Auth server the app expects, when sign-in is on                                                               |
| [notifications.md](notifications.md)             | Permission flow, push registration, opening a screen from a tap                                                          |
| [builds-and-tooling.md](builds-and-tooling.md)   | pnpm, scripts, hooks, tests, renaming, build profiles, troubleshooting                                                   |
| [demo.md](demo.md)                               | The demo feature and the Components tab, and how to replace them                                                         |

## Find a feature

| I want to...                                      | Use                                                       | Page                                             |
| ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Add a screen with a title that collapses          | `LargeTitleScreen`                                        | [header.md](header.md)                           |
| Add header buttons                                | `rightContent` with `HeaderIconButton`                    | [header.md](header.md)                           |
| Put artwork above the title                       | `hero`                                                    | [header.md](header.md)                           |
| Show a long list efficiently                      | the `list` prop                                           | [header.md](header.md)                           |
| Load more on scroll, pull to refresh              | `onEndReached`, `scrollViewProps.refreshControl`          | [api-and-storage.md](api-and-storage.md)         |
| Add a pushed screen, a route with an id, a modal  | `Stack.Protected` groups                                  | [architecture.md](architecture.md)               |
| Add a tab or change the round action button       | `ITEMS`, `action`                                         | [tab-bar.md](tab-bar.md)                         |
| Make a glass surface                              | `GlassSurface`                                            | [glass.md](glass.md)                             |
| Open a bottom sheet above the tab bar             | `useSheet().present`                                      | [glass.md](glass.md)                             |
| Let the user pick an action                       | `ActionSheet`                                             | [glass.md](glass.md)                             |
| Explain a permission first                        | `PermissionSheet`                                         | [notifications.md](notifications.md)             |
| Show "Saved"                                      | `useNotify().success`                                     | [feedback-and-states.md](feedback-and-states.md) |
| Show "Deleted" with Undo                          | `useGlassToast()` with `onUndo`                           | [glass.md](glass.md)                             |
| Ask before a destructive action                   | `useConfirmDelete()`                                      | [feedback-and-states.md](feedback-and-states.md) |
| Swipe actions on a row                            | `SwipeableRow`                                            | [lists-and-gestures.md](lists-and-gestures.md)   |
| Long-press menu on a row                          | `useContextMenu()`                                        | [glass.md](glass.md)                             |
| A menu from a header button                       | HeroUI `Menu` with `MENU_WIDTH`                           | [lists-and-gestures.md](lists-and-gestures.md)   |
| A settings row, switch, segmented control, picker | the `SettingsRow` family                                  | [settings.md](settings.md)                       |
| An empty list, a failed read, a spinner           | `EmptyState`, `DataError`, `ScreenLoading`                | [feedback-and-states.md](feedback-and-states.md) |
| A form with validation                            | `FormTextField` and Zod                                   | [forms.md](forms.md)                             |
| A date picker, a progress ring, colour chips      | `Calendar`, `ProgressRing`, `ColorChips`                  | [widgets.md](widgets.md)                         |
| Store records on the device                       | a table, a `RecordTable`, a repository, `useLiveQuery`    | [database.md](database.md)                       |
| Store a small device setting                      | `readSetting`, `writeSetting`                             | [api-and-storage.md](api-and-storage.md)         |
| Call my server                                    | `api()` with a Zod schema, React Query                    | [api-and-storage.md](api-and-storage.md)         |
| Work with dates, make ids                         | `src/lib/dates.ts`, `newId()`                             | [api-and-storage.md](api-and-storage.md)         |
| Turn sign-in on, read the user, sign out          | `EXPO_PUBLIC_AUTH_ENABLED`, `useAuthGate()`               | [auth.md](auth.md)                               |
| Change colours, accent, radius, fonts             | `global.css`, `accent-preference.ts`                      | [theming.md](theming.md)                         |
| Add a string or a language                        | `en.ts`, `it.ts`, `LANGUAGES`                             | [i18n.md](i18n.md)                               |
| Ask for notifications, open a screen from a tap   | `requestNotificationPermission`, `useNotificationRouting` | [notifications.md](notifications.md)             |
| Rename the app, build it                          | `pnpm run init`, `eas.json`                               | [builds-and-tooling.md](builds-and-tooling.md)   |
| Write a test                                      | Vitest, `openTestDatabase()`                              | [builds-and-tooling.md](builds-and-tooling.md)   |

## Where things live

```
src/app            routes (Expo Router). (tabs) is the app; onboarding, sign-in and account screens sit outside it
src/components     shared UI: header, tab bar, glass, sheets, rows, menus, states, widgets
src/features       one folder per feature (schema, repository, components); `demo` is the example
src/lib            everything non-visual: db, api, auth, config, i18n, theme, storage, notifications
```

`src/lib` and `src/components` never import from `src/features`.

## HeroUI Native docs

[`heroui-native/`](heroui-native/) holds the HeroUI Native documentation (MDX) for the installed version, indexed in `AGENTS.md`. Read a component's page there before using it; never guess a prop.

## Keeping these docs true

When you change behaviour a page describes, update that page in the same change. When a page and the code disagree, the code and the installed packages win.
