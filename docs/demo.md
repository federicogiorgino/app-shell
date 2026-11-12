# The demo feature

`src/features/demo` plus the routes `(tabs)/index.tsx`, `(tabs)/components.tsx` and `item/[id].tsx`. It exists to show every shell pattern working together, and to be copied. **Delete it, or keep it as a living style guide, when you start your own app.**

## What it contains

| File                        | Role                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`                 | The `item` record: `itemFieldsSchema`, `ItemFields`, `ItemInput`, `Item`, `itemTable` (a `RecordTable`), `ITEM_COLORS` (8 data colours) |
| `repository.ts`             | `listItems`, `getItem`, `saveItem`, `updateItem`, `deleteItem` (returns an undo function), `addSampleItems`                             |
| `repository.test.ts`        | Vitest cases against the in-memory database                                                                                             |
| `use-item-actions.ts`       | `useItemActions()`: the commands a row runs (open, edit, toggleDone, toggleFavorite, remove, openMenu)                                  |
| `components/item-row.tsx`   | `ItemRowContent` (what a row shows) and `ItemRow` (the row with all gestures)                                                           |
| `components/item-sheet.tsx` | `ItemSheetProvider` and `useItemSheet()`: the Add and Edit glass sheet                                                                  |
| `src/lib/db/migrations.ts`  | The `item` table (migration 1)                                                                                                          |

## The `item` record

| Field      | Type    | Rules                                                            |
| ---------- | ------- | ---------------------------------------------------------------- |
| `title`    | string  | trimmed, 1 to 200 characters, required                           |
| `note`     | string  | up to 2000 characters, default `""`                              |
| `color`    | string  | `#RRGGBB`; a data colour applied with `style`, not a theme token |
| `done`     | boolean | default `false`                                                  |
| `favorite` | boolean | default `false`                                                  |

Plus `id`, `createdAt`, `updatedAt`, `deletedAt` ([database.md](database.md)). The list orders favourites first, then newest first.

## The repository

All writes go through `writeTransaction(["item"], ...)`, so every live query on `item` refreshes after the commit.

- `saveItem(input)`: creates (no `id`) or replaces (with `id`) a full item; validation errors throw.
- `updateItem(item, changes)`: reads nothing; writes the whole item with `changes` applied (records are always written whole).
- `deleteItem(item)`: tombstones and returns `undo()`, which writes the item back.
- `addSampleItems(titles)`: seeds items (the first is a favourite); useful from a dev seed in `useLocalStore(prepare)`.

## Home: the list (`(tabs)/index.tsx`)

A `LargeTitleScreen` with the `list` prop (a virtualized `FlatList` under the header) over `useLiveQuery(["item"], ...)`. Each row is an `ItemRow` inside a `mx-4 mb-2 rounded-3xl` card. Scrolling closes a row left open by a swipe (`scrollViewProps.onScrollBeginDrag: closeOpenRow`). It handles the states a data screen needs: `ScreenLoading`, `DataError` with a retry (an `attempt` counter in the live-query key), and an `EmptyState` with an Add samples action when the list is empty. The header has two `HeaderIconButton`s: Settings (pushes `/settings`) and Add (opens the Add sheet). The tab bar's round action button opens the same sheet.

## `ItemRow`: every gesture

| Gesture              | Result                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| Tap                  | Opens the detail screen (`/item/[id]`)                                   |
| Swipe right          | Toggle done (leading action, success tone), with an Undo toast           |
| Swipe left           | Edit (accent) and Delete (danger) buttons; a long swipe runs Delete      |
| Long press           | The context menu: Edit, Mark done, Favourite, Delete (destructive, last) |
| VoiceOver / TalkBack | Every action above, plus Favourite, as accessibility actions             |

`ItemRowContent` is exported because the context menu draws the same content again, lifted above the scrim. Delete is immediate with an Undo toast here; use `useConfirmDelete()` first for data that cannot be restored.

## `useItemActions()`

One place for what a row can do, shared by swipes, the menu and accessibility actions. A failed write shows `notify.error(t("errors.generic"))`. Completing and deleting trigger haptics (`Haptics.notificationAsync` Success, `impactAsync` Medium). Toggling done and deleting show a glass toast with Undo that writes the previous item back.

## The Add and Edit sheet

`ItemSheetProvider` is mounted in `(tabs)/_layout.tsx`, after the tabs, with the `blurTarget`. `useItemSheet()` returns `openAdd()` and `openEdit(item)`. It is a `GlassSheet` with a title input (autofocused when adding), a note input, and colour chips (`ColorChips`). The confirm button is disabled until the title is non-empty; Done on the keyboard saves; Save shows a toast. The inputs are `BottomSheetTextInput` wrapped with `withUniwind` so the sheet rides above the keyboard and still takes classes.

## Detail (`item/[id].tsx`)

A pushed screen with: a full-bleed hero in the item's colour above the large title; the title (wrapping, 28 pt) with an eyebrow showing Favourite; a `⋯` menu (HeroUI `Menu`, anchored to the header button) with Favourite and Delete; the note in a `Surface`; a Status section with two switch rows that write straight to the database; a Details section with the colour and creation date. Loading, error (retry) and not-found (`EmptyState` with Go back) are handled. Delete asks with `useConfirm({ destructive })`, deletes, goes back and shows an Undo toast.

## Components tab (`(tabs)/components.tsx`)

The living style guide: toasts (success, error, with Undo), the confirmation dialog, the action sheet, the form sheet, the permission sheet, a swipe and long-press row, every button variant, settings rows (link, switch, segment), the progress ring, colour chips, the calendar, and the empty and error states. Details below.

## Making it your own

1. Copy `src/features/demo` to `src/features/<name>`; rename the table in `schema.ts` and add a migration (append, never edit).
2. Replace `ITEM_COLORS` and the fields; update `repository.ts`, `use-item-actions.ts` and the row.
3. Point `(tabs)/index.tsx` and the detail route at the new feature.
4. Delete the demo folder, `item/[id].tsx` if unused, the `demo` and `showcase` i18n groups, and the `item` migration (only before any user has the app; otherwise add a migration that drops it).

## The Components tab in detail

`src/app/(tabs)/components.tsx`. A living style guide: every building block in one screen, to see in light and dark, with larger text and Reduce Transparency, and to copy from. Delete the tab when you start your own app, or keep it as the team's reference. Its strings are in the `showcase` group of the language files.

### Sections, top to bottom

| Section                | Shows                                                                                                                                       | Copy from it                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Feedback               | Success toast, error toast with a description, a toast with Undo, a destructive confirmation dialog that reports "Confirmed" or "Cancelled" | `useNotify`, `useGlassToast`, `useConfirm`                           |
| Sheets and dialogs     | The action sheet (Share, Duplicate, Delete with a confirmation), a form sheet with a confirm button, the permission sheet                   | `useSheet().present`, `ActionSheet`, `GlassSheet`, `PermissionSheet` |
| Row gestures           | One swipeable row: tap, swipe right (done), swipe left (Edit, Delete with a confirmation), long press (context menu with Share and Delete)  | `SwipeableRow`, `useContextMenu`, `useConfirmDelete`                 |
| Buttons                | Primary, secondary, tertiary, ghost, danger                                                                                                 | HeroUI `Button` variants                                             |
| Settings rows          | A notification permission row (opens the sheet, or system settings when denied), a switch row, a segmented row                              | `SettingsLinkRow`, `SettingsSwitchRow`, `SettingsSegmentRow`         |
| Progress               | A `ProgressRing` with less and more buttons                                                                                                 | `ProgressRing`                                                       |
| Chips                  | `ColorChips` in multi-select mode                                                                                                           | `ColorChips`, `FieldLabel`                                           |
| Calendar               | An inline `Calendar`                                                                                                                        | `Calendar`, `today()`                                                |
| Empty and error states | `EmptyState` and `DataError` (retry shows a toast)                                                                                          | `EmptyState`, `DataError`                                            |

### How the sheets are opened

The tab is inside the glass tab bar, so sheets are opened with `useSheet()` (not rendered in the screen) to appear **above** the bar:

```tsx
const { present, dismiss } = useSheet();
const showActions = () => present((sheet) => <ActionSheet {...sheet} title={...} actions={[...]} />);
const askPermission = () => present((sheet) => <PermissionSheet {...sheet} onAllow={allow} onNotNow={dismiss} />);
```

See [glass.md](glass.md#sheetprovider-and-usesheet).

### Layout

A `LargeTitleScreen` with a `gap-6 px-4 pt-2 pb-8` column of `Showcase` blocks (a small uppercase header over its content). Button groups sit in a HeroUI `Surface` with `gap-2`; the settings rows use a `SettingsSection`.

### Extending it

Add a block for every new reusable component: a `Showcase` with a translated title, one example per variant, and the `showcase.*` strings in every language. Keep demo state local (`useState`); nothing on this tab writes to the database.
