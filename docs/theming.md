# Theming, tokens and styling

The visual system: colours, type, radii, metrics, the HeroUI overrides, the light/dark/system theme, accent presets, Reduce Transparency and Larger Text. The contract for new UI is [../../DESIGN.md](../DESIGN.md); this page documents what the shell actually defines.

## The stack

HeroUI Native components styled with Tailwind CSS v4 classes through **Uniwind** (not NativeWind). Metro is wrapped with `withUniwindConfig` (`metro.config.js`, `cssEntryFile: ./src/global.css`). Classes work on React Native components (`className="bg-background px-4"`); third-party components that take no classes get `style` (resolve classes with `useResolveClassNames`, or wrap with `withUniwind`).

Generated files: `uniwind-types.d.ts` and `.expo/types` appear on the first `expo start`; they are git-ignored. Typecheck needs them.

## `src/global.css`

Imports in order: `tailwindcss`, `uniwind`, `heroui-native/styles`, `./heroui-overrides.css`, plus `@source` for the HeroUI package so its classes are generated.

### Fonts

Inter (400, 500, 600, 700), loaded with `@expo-google-fonts/inter` in the root layout. `--font-normal`, `--font-medium`, `--font-semibold`, `--font-bold` map to the four family names; define all four together and keep the names in sync with the `useFonts` keys. Weight is set with `font-normal`, `font-medium`, `font-semibold`, `font-bold`.

To switch fonts: install the family (`pnpm exec expo install @expo-google-fonts/<font>`), import its four weights in `src/app/_layout.tsx` and pass them to `useFonts`, then update the four names in `global.css`. A missing weight makes iOS pick the wrong face. If loading fails, the app falls back to the system font. Italic and other weights are not loaded; add them the same way.

### Type scale

| Class              | Size / line height | Use                                                                 |
| ------------------ | ------------------ | ------------------------------------------------------------------- |
| `text-large-title` | 34 / 41            | Screen titles (the header uses explicit sizes with the same values) |
| `text-title`       | 22 / 28            | Sheet and error titles                                              |
| `text-headline`    | 20 / 25            | Dialog titles                                                       |
| `text-body`        | 17 / 22            | Rows, buttons, menu items                                           |
| `text-secondary`   | 15 / 20            | Descriptions, subtitles                                             |
| `text-caption`     | 13 / 18            | Captions, group headers                                             |
| `text-tab`         | 11 / 13            | Tab labels                                                          |

Text does not inherit from `View` or `Pressable` in React Native: put typography and colour classes on the `Text` (or the HeroUI text part such as `Button.Label`), not on a parent.

### Radius

HeroUI's radius scale (`rounded-lg` 8 … `rounded-4xl` 32) plus one addition, `rounded-sheet` = 42 px, used by sheets. `RADIUS` in `src/lib/metrics.ts` repeats `2xl` 16, `3xl` 24 and `sheet` 42 for places that need numbers.

### Palette (the semantic tokens)

Only base values are set; HeroUI derives hover, soft and focus shades.

| Token                         | Light                | Dark                        |
| ----------------------------- | -------------------- | --------------------------- |
| `background`                  | `#f2f2f7`            | `#000000`                   |
| `surface`                     | `#ffffff`            | `#1c1c1e`                   |
| `surface-secondary`           | `#ebebf0`            | `#2c2c2e`                   |
| `foreground`                  | `#0c0c10`            | HeroUI default (near white) |
| `accent`, `accent-foreground` | `#4b5bd8`, `#ffffff` | `#8c9bff`, `#10132b`        |
| `success`                     | `#2e9e5b`            | `#4cc37d`                   |
| `danger`                      | `#e5484d`            | `#ff6369`                   |
| `warning`                     | `#e8821a`            | `#ffa23d`                   |

Use the utilities (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `bg-accent`, `text-accent-foreground`, `bg-accent-soft`, `border-border`, `bg-separator`, `bg-danger-soft`, ...). Never hardcode a colour. Exceptions: **data colours** (an item's colour, a category colour) are data and are applied by `style`; accent presets use hex because React Native style props do not understand `oklch()`. Keep `success`, `warning`, `danger` for their meaning only. Read a token in code with `useThemeColor("accent")` or `useThemeColor(["muted", "accent"])`.

In a prop that needs a colour value (an icon, an SVG stroke, a gradient), read the token:

```tsx
const accent = useThemeColor("accent");
<Ionicons name="add" size={20} color={accent} />;
```

To change the default palette for everyone, edit the variables in `src/global.css`. **Keep the `:root` wrapper** inside `@layer theme`: without it Uniwind compiles the overridden variables to `unset` and the HeroUI defaults stay. List only the variables you change; derived shades (hover, soft, focus) follow.

## HeroUI overrides

`src/heroui-overrides.css`. HeroUI Native restyled once for the whole app. Each rule overrides HeroUI's own class of the same name and wins because Uniwind compiles it after HeroUI's. Only sizes, shapes and type change; colours stay tokens. When you override a base rule, restate its state rules (`is-selected`) after it.

| Component | Override                                                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button    | Pills: `sm` 36, `md` 44, `lg` 54 pt tall, 14/18/20 pt side padding; label semibold at 15 pt (`sm`) or 17 pt; the icon-only variant has no padding and a square aspect ratio        |
| ListGroup | 54 pt min-height rows, 16 pt side padding, 12 pt gap, `text-body` titles, `text-secondary` descriptions, a pressed tint (`bg-default`) because HeroUI gives rows no press feedback |
| Tabs      | Segmented control labels 15 pt semibold                                                                                                                                            |
| TagGroup  | 36 pt pill chips with a surface-secondary background; selected: soft accent fill, accent outline, accent semibold label                                                            |
| Dialog    | 24 pt padding, `rounded-4xl`, headline title                                                                                                                                       |

To change a HeroUI component globally, add a rule here; do not restyle it per screen.

## `src/lib/metrics.ts`

Numbers that must be used in `style` (Pressable style functions, swipe panels, third-party components). They mirror the CSS; change both together.

| Constant           | Value                          | Meaning                                           |
| ------------------ | ------------------------------ | ------------------------------------------------- |
| `RADIUS`           | `2xl` 16, `3xl` 24, `sheet` 42 | The radius scale                                  |
| `ROW_HEIGHT`       | 54                             | A list row and a large button                     |
| `MENU_ITEM_HEIGHT` | 44                             | A menu item                                       |
| `MENU_WIDTH`       | 240                            | HeroUI `Menu.Content` width. Always pass it       |
| `GUTTER`           | 16                             | Side padding in rows and the page gutter (`px-4`) |

## Light, dark or system

`src/lib/theme-preference.ts`. `ThemePreference` is `system`, `light` or `dark`; stored as the `theme` setting (anything else reads as `system`).

- `getThemePreference()`: the stored value.
- `setThemePreference(preference)`: stores it and calls `Uniwind.setTheme(preference)`, applied immediately everywhere.
- `applyStoredThemePreference()`: called once in the root layout before the first render, so the saved theme is used from frame one.
- `THEME_PREFERENCES`: the three values, for building pickers.

In components, read the active theme with `useUniwind().theme` (`light` or `dark`) only when you must (swatches, the status bar, the splash mark); otherwise let the tokens resolve it. Never branch component code by colour mode.

## Accent colour

`src/lib/accent-preference.ts`. Five presets, each with a light and a dark value (dark gets a lighter shade of the same hue) and the foreground colour for text on top of it. Red, green and amber are left out on purpose: they carry meaning (danger, success, warning).

| Id                 | Light     | Dark      |
| ------------------ | --------- | --------- |
| `indigo` (default) | `#4B5BD8` | `#8C9BFF` |
| `blue`             | `#0485F7` | `#4DA6FF` |
| `violet`           | `#8C52FF` | `#B08CFF` |
| `pink`             | `#ED3593` | `#FF6EB4` |
| `teal`             | `#00B5B5` | `#3FD1D1` |

- `setAccentPreference(id)`: stores it (`accent` setting), rewrites `--accent` and `--accent-foreground` for both themes with `Uniwind.updateCSSVariables`, and notifies subscribers. HeroUI's focus, hover and soft shades follow because they are derived from those two variables.
- `applyStoredAccent()`: called at startup; does nothing for the default (it is already in `global.css`).
- `useAccentPreference()`: the selected id; re-renders on change.
- `accentSwatch(id, theme)`: the preset's colour for a swatch.
- `ACCENTS`, `ACCENT_IDS`, `DEFAULT_ACCENT`, `AccentId`.

To add a preset: add an entry to `ACCENTS` (both themes), a string `accent.<id>` in every language, and nothing else (the picker iterates `ACCENT_IDS`). Pick an accent foreground with contrast on the accent.

## Reduce Transparency

`src/lib/reduce-transparency.ts`. Glass falls back to an opaque tint when the **system** setting is on (iOS; there is no readable system setting on Android) **or** the in-app switch (`reduceTransparency` setting, Settings, Accessibility) is on.

- `useReduceTransparency()`: true when glass must use its fallback (preference or system). Used by `GlassSurface` and the context menu scrim.
- `useReduceTransparencyPreference()`: the in-app switch alone, for the switch row.
- `setReduceTransparencyPreference(on)`: stores it and applies it immediately.

## Larger Text

There is no in-app switch: the system font size scales the app (`allowFontScaling` stays on). `useLargerText()` is true from a system font scale of 1.3, to let one-line titles wrap. Fixed-height bars cap their scaling (the compact header title at 1.3, tab labels at 1.2). Test layouts with the largest accessibility font size.

## Motion

Animations use Reanimated. Components that animate on their own (toast, context menu, launch screen, header buttons and title) read `useReducedMotion()` and skip or shorten their animations. Prefer HeroUI components' `animation` prop over overriding animated styles; animated styles and the `style` prop take precedence over `className`.

## Safe areas, RTL and touch

Respect safe-area insets (`useSafeAreaInsets`) at screen edges, for floating controls, sheets and toasts. Use logical start and end (`ms-`, `me-`, `marginStart`) for RTL. Keep touch targets at least 44 pt (use `hitSlop` when the visible control is smaller). Disabled controls keep `--opacity-disabled` 0.5 and are not interactive.

## Adding UI: the checklist

1. Check whether HeroUI Native already has it; read its docs.
2. Use semantic tokens and the type scale; no raw colours or neutral palette classes (`gray-*`).
3. Put text styles on the text part.
4. Handle loading, error, empty and success.
5. Add accessibility roles, labels and states.
6. Check light, dark, larger text and Reduce Transparency.
