# Settings rows and screens

`src/components/settings-rows.tsx`, `src/components/fields.tsx` (`Tile`), `src/app/settings.tsx`, `src/app/(settings)/*`.

Every settings-style row in the app is **one component**, `SettingsRow`. The other row components are the same row with different props, so heights, paddings, columns and separators line up everywhere. Never hand-build a HeroUI `ListGroup.Item` or draw your own `Separator`.

## `SettingsSection`

A titled group of rows, like an iOS Settings group.

```tsx
<SettingsSection title={t("settings.appearance")} footer={<SettingsHint>...</SettingsHint>}>
  <SettingsLinkRow icon="language-outline" title="Language" value="English" onPress={...} />
  <SettingsSwitchRow icon="eye-outline" title="Reduce transparency" value={on} onChange={setOn} />
</SettingsSection>
```

| Prop       | Meaning                                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`    | Small uppercase caption above the group (a header for screen readers)                                                                                          |
| `footer`   | Anything under the group, usually a `SettingsHint`                                                                                                             |
| `children` | `SettingsRow` and its wrappers. `false` and `null` are skipped; fragments are looked through. Only rows may be children, because the section reads their props |

The section wraps rows in a HeroUI `ListGroup` (`rounded-xl`, no shadow) and **draws the separators**:

- Between two rows it renders one `Separator`. It starts where the **row above** puts its text: `GUTTER + TILE_SIZE + 12` = 58 pt when that row has an icon or `leading`, otherwise 16 pt. It runs to the group's right edge, like iOS.
- `separatorShown={false}` on a row removes the separator **below** it (default `true`); the last row never has one.
- If any row has `selected`, the group gets the `radiogroup` role.

Exports: `TEXT_INSET_WITH_LEADING` (58), used by the separator.

## `SettingsRow`

| Prop                 | Type                  | Meaning                                                                                                                            |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `title`              | string                | The row's title. Optional only for a full-width `control`                                                                          |
| `description`        | string                | A second muted line                                                                                                                |
| `icon`               | Ionicons name         | A glyph on a rounded tile (`Tile`), accent on soft accent                                                                          |
| `leading`            | node                  | Custom leading content (a colour swatch), centred in the same 30 pt column as a tile. Wins over `icon`                             |
| `value`              | string or node        | Trailing text (muted) or a node, before the chevron                                                                                |
| `onPress`            | function              | Makes the row pressable; shows a chevron unless `chevron` is `false` or the row is an option                                       |
| `selected`           | boolean               | Makes the row a **radio option**: a checkmark when `true`, none when `false`, the `radio` role and the selected state              |
| `tone`               | `default` or `danger` | `danger` colours the title and the tile; keep it for destructive rows (Sign out, Delete)                                           |
| `disabled`           | boolean               | Not pressable                                                                                                                      |
| `loading`            | boolean               | A spinner replaces the trailing accessory, the row ignores presses and reports `busy`                                              |
| `chevron`            | boolean               | Overrides the automatic chevron                                                                                                    |
| `control`            | node                  | A trailing control (a switch). The row itself is then not pressable and not an accessibility element, so the control is the target |
| `controlLayout`      | `trailing` or `fill`  | `fill` with no title stretches the control across the whole row (a full-width segmented control)                                   |
| `accessibilityLabel` | string                | Overrides the spoken label                                                                                                         |
| `separatorShown`     | boolean               | Separator below this row (default `true`)                                                                                          |

Layout: an optional 30 pt leading column, the content (title, description) and a suffix (`gap-2`: value, spinner, checkmark, chevron, control). Heights and paddings (54 pt min height, 16 pt sides, 12 pt gap) come from `heroui-overrides.css`. Pressed rows get the default tint.

## The wrappers

| Component                   | Fixed props                                                       | Adds                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SettingsLinkRow`           | `onPress` required; no `control`, `selected`                      | Opens a screen or runs an action (chevron)                                                                             |
| `SettingsSwitchRow`         | `title`, `value: boolean`, `onChange(value)` required; `disabled` | A HeroUI `Switch` that turns **success green** when on (like iOS), labelled by the title                               |
| `SettingsSegmentRow<Value>` | `options: { value, label }[]`, `value`, `onChange`                | A HeroUI `Tabs` segmented control. With a `title` it sits at the end of the row (`w-40`); without one it fills the row |
| `SettingsOptionRow`         | `selected` and `onPress` required                                 | One choice among several (checkmark when selected), for pickers                                                        |
| `SettingsHint`              | children                                                          | A `gap-2 px-4` block for a footer                                                                                      |

All wrappers take the other `SettingsRow` props, including `icon`, `description`, `tone`, `separatorShown`.

## `Tile` (`fields.tsx`)

The icon tile: a 30 pt rounded square with a 17 pt glyph.

| Prop    | Meaning                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| `icon`  | Ionicons name                                                                                                      |
| `tone`  | `default` (accent on soft accent) or `danger` (danger on soft danger)                                              |
| `color` | A **data colour**: tile filled with it and a white glyph. Applied by `style` because it is data, not a theme token |

`TILE_SIZE = 30` is exported and used for the row's leading column and the separator inset.

## The Settings screen (`settings.tsx`)

Pushed from the Home header. Device-only values, stored with `flags.ts`.

| Section                        | Rows                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account (only with sign-in on) | The user's name and email, opens `/account`                                                                                                                                                                                          |
| Appearance                     | A full-width segmented row for **theme** (System, Light, Dark); **Accent colour** (link, shows the swatch); **Language** (link, shows the current language)                                                                          |
| Notifications                  | The permission row: its value shows On, Off or Not set. Tapping when undetermined opens the `PermissionSheet`; when denied it opens the system settings (`Linking.openSettings()`); when granted the row is disabled with no chevron |
| Accessibility                  | **Reduce transparency** switch                                                                                                                                                                                                       |
| Footer                         | App name and version (`settings.version`)                                                                                                                                                                                            |

The notifications row is the full permission flow: `PermissionSheet` explains, Allow calls `requestNotificationPermission`, the result updates the row and shows a toast.

To add a full-screen picker: create `src/app/(settings)/<name>.tsx` (copy `theme.tsx` or `language.tsx`), register `<Stack.Screen name="(settings)/<name>" />` inside the `canEnterApp` group in `src/app/_layout.tsx`, and link to it with a `SettingsLinkRow` that pushes `/<name>` (route groups in parentheses are not part of the URL).

## The picker screens (`(settings)/`)

Each is a `LargeTitleScreen` with one `SettingsSection` of `SettingsOptionRow`s.

| Screen         | Options                                                                    | Writes                                         |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| `accent.tsx`   | The five accent presets, each with a colour swatch as `leading`            | `setAccentPreference(id)`, applied immediately |
| `language.tsx` | System, then every language in `LANGUAGES`, each shown in its own language | `setLanguagePreference(option)`                |
| `theme.tsx`    | System, Light, Dark with icons                                             | `setThemePreference(...)`                      |
| `account.tsx`  | See [auth.md](auth.md)                                                     |                                                |

`theme.tsx` is registered but the Settings screen uses the inline segmented row instead; it is an alternative full-screen picker you can link to if you prefer.

## Adding a setting

1. A row in `settings.tsx` (a `SettingsSwitchRow`, `SettingsSegmentRow` or `SettingsLinkRow` to a picker screen).
2. A preference module next to `theme-preference.ts`: `readSetting` the initial value at import time (synchronous), keep a module variable and a listener set, expose `set...` (writes with `writeSetting`, then notifies) and a `use...` hook with `useSyncExternalStore`. `reduce-transparency.ts` is the smallest example.

   ```ts
   // src/lib/compact-mode.ts
   import { useSyncExternalStore } from "react";
   import { readSetting, writeSetting } from "./flags";

   let compact = readSetting("compact") === "1";
   const listeners = new Set<() => void>();

   export function setCompactMode(value: boolean): void {
     compact = value;
     writeSetting("compact", value ? "1" : "0");
     listeners.forEach((listener) => listener());
   }

   export function useCompactMode(): boolean {
     return useSyncExternalStore(
       (listener) => {
         listeners.add(listener);
         return () => listeners.delete(listener);
       },
       () => compact
     );
   }
   ```

   Then the row: `<SettingsSwitchRow icon="contract-outline" title={t("settings.compact")} value={useCompactMode()} onChange={setCompactMode} />`.

3. Strings in every language file.
4. A picker screen: add the route to the `canEnterApp` group in `_layout.tsx`.
5. Update [theming.md](theming.md) if it affects appearance.
