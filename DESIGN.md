# Design contract

The visual rules for every screen built on App Shell. The shell's look is **Liquid Glass on HeroUI Native**: calm grouped surfaces, one accent, glass for everything that floats. The values below are what the code defines (`src/global.css`, `src/heroui-overrides.css`, `src/lib/metrics.ts`, `src/lib/glass.ts`); details and how to change them are in `docs/theming.md`. When this file and the code disagree, the code wins.

## Principles

- Hierarchy comes from content order, spacing, type and surface level, not decoration.
- One strong accent for primary actions and selection. `success`, `warning` and `danger` only for their meaning, always paired with text or an icon.
- Floating things are glass (`GlassSurface`): the tab bar, the compact header, sheets, the toast, the long-press menu, header buttons. Content is on solid surfaces.
- Compose HeroUI Native components and the shell's components before writing new ones. Never restyle a component per screen; global changes go in `heroui-overrides.css`.
- The same code serves light and dark: semantic tokens only, never branch on the colour mode.

## Colour

Use the Uniwind utilities of the semantic tokens: `bg-background`, `bg-surface`, `bg-surface-secondary`, `text-foreground`, `text-muted`, `bg-accent`, `text-accent-foreground`, `bg-accent-soft`, `bg-default`, `border-border`, `bg-separator`, `bg-success`, `bg-warning`, `bg-danger` and their `-foreground` and `-soft` variants. In a prop that needs a value, `useThemeColor("token")`.

| Token | Light | Dark |
| --- | --- | --- |
| `background` (the canvas) | `#f2f2f7` | `#000000` |
| `surface` (cards, row groups) | `#ffffff` | `#1c1c1e` |
| `surface-secondary` | `#ebebf0` | `#2c2c2e` |
| `foreground` | `#0c0c10` | near white |
| `accent` / `accent-foreground` | `#4b5bd8` / `#ffffff` | `#8c9bff` / `#10132b` |
| `success` | `#2e9e5b` | `#4cc37d` |
| `warning` | `#e8821a` | `#ffa23d` |
| `danger` | `#e5484d` | `#ff6369` |

The accent is user-selectable (indigo, blue, violet, pink, teal); never assume indigo. Data colours (a colour the user picked for a record) are applied with `style`, with white glyphs on them (`ON_DATA_COLOR`). No raw palette classes (`gray-500`), no hex in components.

## Type

Inter in four weights (`font-normal`, `font-medium`, `font-semibold`, `font-bold`).

| Class | Size / line | Use |
| --- | --- | --- |
| large title | 34 / 41 bold | Screen titles (drawn by `LargeTitleScreen`) |
| `text-title` | 22 / 28 | Sheet and error titles |
| `text-headline` | 20 / 25 | Dialog titles |
| `text-body` | 17 / 22 | Rows, buttons, body text |
| `text-secondary` | 15 / 20 | Descriptions, subtitles, button labels (small) |
| `text-caption` | 13 / 18 | Captions, group headers (uppercase, semibold, muted) |
| `text-tab` | 11 / 13 | Tab labels |

Text styles go on the text element (or the HeroUI text part such as `Button.Label`), never on a parent view. Tabular numbers (`fontVariant: ["tabular-nums"]`) for changing numbers. Font scaling stays on.

## Shape and size

| What | Value |
| --- | --- |
| Radius scale | `rounded-lg` 8, `rounded-xl` 12, `rounded-2xl` 16, `rounded-3xl` 24, `rounded-4xl` 32, `rounded-sheet` 42 |
| Row groups | `rounded-xl`; list cards `rounded-3xl`; dialogs `rounded-4xl`; sheets 42 |
| Buttons | Pills: `sm` 36, `md` 44, `lg` 54 pt tall |
| List rows | 54 pt minimum, 16 pt side padding, 12 pt gap, a 30 pt icon tile |
| Menus | 44 pt items; HeroUI `Menu.Content` always gets `width={MENU_WIDTH}` (240) |
| Page gutter | 16 pt (`px-4`); sections 24 pt apart (`gap-6`) |
| Touch targets | At least 44 pt |

Nested surfaces get a smaller radius than their parent. Do not mix other radius or spacing systems.

## Elevation and glass

- Content surfaces sit flat on the background (row groups have no shadow); floating layers use `shadow-overlay` and glass.
- Glass is always `GlassSurface`: an expo-blur material (intensity 60) under a 10% background wash, with a 0.5 pt inner rim and outer hairline. With Reduce Transparency (system or in-app) it becomes an opaque tint.
- Anything floating inside the tabs renders in the tabs layout, after the tabs, so it sits above the tab bar and its glass matches (`useSheet`, the toast, the context menu).

## Components to reach for

| Need | Use |
| --- | --- |
| Screen and header | `LargeTitleScreen`, `HeaderIconButton` |
| Grouped rows, settings, pickers | `SettingsSection` with `SettingsRow` and its wrappers |
| List rows with actions | `SwipeableRow`, `useContextMenu` |
| Floating panels | `GlassSheet`, `ActionSheet` via `useSheet()` |
| Feedback | `useNotify`, `useGlassToast` (Undo), `useConfirmDelete` |
| States | `ScreenLoading`, `EmptyState`, `DataError`, `ErrorScreen` |
| Buttons | HeroUI `Button`: `primary` (one per context), `secondary`, `tertiary`, `ghost`, `danger`, `danger-soft` |
| Content blocks | HeroUI `Surface`, `Card` |

## Motion

Reanimated only. Motion explains presses, selection, expansion and dismissal; it is never decoration. Respect Reduce Motion (`useReducedMotion()`): skip or shorten animations. Customise HeroUI motion through a component's `animation` prop, not by overriding animated styles.

## Accessibility

Every interactive element has a role and a translated label; icon-only buttons always have a `label`. Every gesture has an accessibility action. Selected, disabled and busy states are exposed. Never use colour alone. Respect safe areas and the keyboard. Test with a large system font, VoiceOver and TalkBack, light and dark, and Reduce Transparency.
