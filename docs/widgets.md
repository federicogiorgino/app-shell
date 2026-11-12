# Widgets and small components

Self-contained pieces for the showcase and for real screens: `Calendar`, `ProgressRing`, `ColorChips`, `FieldLabel`, `Tile`.

## `Calendar` (`calendar.tsx`)

An inline month calendar.

```tsx
<Calendar value={date} onChange={setDate} weekStart={1} />
```

| Prop             | Meaning                                             |
| ---------------- | --------------------------------------------------- |
| `value`          | The selected `LocalDate` (`YYYY-MM-DD`)             |
| `onChange(date)` | Called with the tapped day                          |
| `weekStart`      | 0 (Sunday) to 6; the first column. Use 1 for Monday |

- Header: the month and year (`Intl.DateTimeFormat` in the app language) and previous and next month buttons (44 pt targets, labelled `calendar.previousMonth` and `nextMonth`).
- A row of narrow weekday initials in the chosen order, hidden from screen readers.
- A grid of 38 pt day buttons. The selected day is filled with the accent; today is accent-coloured bold text. Digits use tabular numbers. Each day is a button with a full spoken label ("Sunday, November 1") and a `selected` state.
- The shown month starts as the month of `value` and is then internal state: changing `value` from outside to another month does not move the view. Remount it with a `key` (for example the month) if you need that.
- Dates come from `src/lib/dates.ts` (`monthGrid`, `addMonths`, `parseLocalDate`, `today`), so it is local-time and DST-safe.

## `ProgressRing` (`progress-ring.tsx`)

A 60 px ring (react-native-svg) with a percentage in the middle.

| Prop                 | Meaning                             |
| -------------------- | ----------------------------------- |
| `fraction`           | 0 to 1; clamped                     |
| `accessibilityLabel` | What the ring measures ("Progress") |

The track is `surface-secondary`, the arc is the accent with rounded caps and turns `success` green at 100%. The ring is exposed as a `progressbar` with `min 0`, `max 100` and the rounded percentage as `now`; the percentage text uses tabular numbers.

## `ColorChips` (`fields.tsx`)

Chips with a colour dot, built on HeroUI's `TagGroup` (36 pt pill chips; the selected chip gets an accent outline and a soft accent fill, from `heroui-overrides.css`).

| Prop           | Meaning                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `options`      | `{ id, name, color }[]`; `name` is the label, `color` the dot (a data colour) |
| `selected`     | The selected ids (one for a single choice, several for multi-select)          |
| `onToggle(id)` | The id that was tapped                                                        |

TagGroup reports the whole selection set; `ColorChips` works out which chip changed and calls `onToggle` with it, so a single choice is `onToggle={(id) => setValue(id)}` and a multi-select toggles membership.

## `FieldLabel` and `Tile` (`fields.tsx`)

`FieldLabel`: a small bold muted caption (`mb-2 text-caption`) above a field or chip group. `Tile`: see [settings.md](settings.md#tile-fieldstsx). `ON_DATA_COLOR` (`#FFFFFF`) is the colour for glyphs and checks drawn on a data colour; pick data colours dark enough for white to read on them.

## Typography, buttons and surfaces from HeroUI

The showcase and screens also use HeroUI Native directly: `Button` (variants `primary`, `secondary`, `tertiary`, `ghost`, `danger`, `danger-soft`; sizes `sm` 36, `md` 44, `lg` 54 pt pills), `Surface`, `Card`, `Typography` (`Heading`, `Paragraph`), `Spinner`, `Alert`, `Switch`, `Tabs`, `Menu`, `Dialog`, `ListGroup`, `Separator`, `TagGroup`, `TextField`. Their sizes and shapes are tuned once in `src/heroui-overrides.css` ([theming.md](theming.md#heroui-overrides)). Read the HeroUI Native docs before using a component; never guess an API.
