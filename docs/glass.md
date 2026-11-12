# Glass surfaces: material, sheets, toast, menu

The Liquid Glass layer: one material (`GlassSurface`) and everything built on it. All of it is drawn **in place** in the view tree, not in a portal, so the glass sees the same content behind it as the tab bar does.

Files: `src/lib/glass.ts`, `src/components/glass-surface.tsx`, `glass-sheet.tsx`, `sheet-host.tsx`, `action-sheet.tsx`, `permission-sheet.tsx`, `src/lib/glass-toast.tsx`, `src/components/context-menu.tsx`.

## The material

### `glass.ts`

`GLASS_BLUR_INTENSITY = 60` (expo-blur intensity used by every glass element and the compact header).

`useGlassPalette()` returns the values that have no semantic token, for the current app theme (`glassPalette(theme)` is the non-hook form):

| Field         | Light                    | Dark                     | Used for                                                                |
| ------------- | ------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| `colorScheme` | `light`                  | `dark`                   | The blur material's tint                                                |
| `fallback`    | `rgba(250,250,253,0.97)` | `rgba(38,38,43,0.98)`    | Opaque tint when blur is off                                            |
| `rim`         | `rgba(255,255,255,0.9)`  | `rgba(255,255,255,0.17)` | 0.5 px inner rim that catches the light                                 |
| `hairline`    | `rgba(60,60,67,0.14)`    | `rgba(255,255,255,0.1)`  | 0.5 px outer hairline so light glass stays visible on light backgrounds |
| `highlight`   | `rgba(0,0,0,0.07)`       | `rgba(255,255,255,0.14)` | Tab pill, pressed glass menu item                                       |
| `scrim`       | `rgba(10,10,30,0.26)`    | `rgba(0,0,0,0.52)`       | Tint over the blurred screen behind the row menu                        |

### `GlassSurface`

The one glass material. Render it as the **first child of a positioned container**; it fills the container behind its content (three absolutely positioned layers: material, inner rim, outer hairline).

| Prop         | Meaning                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `radius`     | Corner radius (continuous curve). Use `shapeStyle` instead when the radius animates |
| `shapeStyle` | An (animated) style applied to every layer; the tab bar animates its radius with it |
| `fill`       | A solid colour instead of glass (the tab bar's accent action button)                |
| `blurTarget` | Android only: ref to the `BlurTargetView` behind the surface                        |

Which material is drawn:

| Situation                                                         | Result                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `fill` set                                                        | The solid colour (rim and hairline still drawn)               |
| iOS, Reduce Transparency off                                      | `BlurView` at intensity 60 plus a 10% wash of `bg-background` |
| Android 12+ (API 31) with a `blurTarget`, Reduce Transparency off | The same, with `blurMethod: "dimezisBlurViewSdk31Plus"`       |
| Reduce Transparency on, older Android, or no `blurTarget`         | An opaque `fallback` tint, no blur                            |

The rim and hairline are drawn in every case so the fallback never looks flatter than glass.

### Reduce Transparency

An in-app switch (Settings, Accessibility) stored as a device setting. `useReduceTransparency()` (`src/lib/reduce-transparency.ts`) merges it with the system's Reduce Transparency; either one turns the blur off everywhere. See [theming.md](theming.md).

### `blurTarget` on Android

Android blurs a snapshot of a view, so the content behind the glass must be wrapped in expo-blur's `BlurTargetView`. `(tabs)/_layout.tsx` creates one ref, wraps the tab screens in `<BlurTargetView ref={blurTarget}>` and passes the ref to the tab bar, the toast, the context menu and the sheet host. Pass it to any glass you add inside the tabs. Without it Android uses the opaque fallback.

## `GlassSheet`

A floating glass bottom sheet: detached and inset 8 pt from the screen edges and above the bottom safe area, 42 pt corners (`RADIUS.sheet`), a grabber, a 20% backdrop, and a header with a round cancel button, a centred title and an optional round confirm button.

Built on Gorhom's `BottomSheet` **rendered in place** (not HeroUI's portalled sheet, which looked flat).

| Prop                     | Meaning                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `isOpen`, `onOpenChange` | Controlled open state. The sheet calls `onOpenChange(false)` when dismissed by the cancel button, the backdrop, a pan down, or Android back |
| `title`                  | Header title (one line)                                                                                                                     |
| `onConfirm`              | Adds the accent round confirm button; omit it and a spacer keeps the title centred                                                          |
| `confirmLabel`           | Accessibility label of the confirm button (default `common.confirm`)                                                                        |
| `confirmIcon`            | Ionicons name, `checkmark` by default                                                                                                       |
| `isConfirmDisabled`      | Disables the confirm button (an empty required field)                                                                                       |
| `onShown`                | Runs once the open animation ends (focus a field)                                                                                           |
| `blurTarget`             | See above                                                                                                                                   |
| `children`               | The body, in a `BottomSheetScrollView` (content padding 14, gap 12)                                                                         |

Behaviour notes:

- The grabber and header are Gorhom's handle, so they stay put while the body scrolls.
- Text inputs inside must be `BottomSheetTextInput` (wrap it with `withUniwind` to take classes) so the sheet rides above the keyboard (`keyboardBehavior="interactive"`, `keyboardBlurBehavior="restore"`).
- Android back closes the sheet before anything else.
- The sheet is sized to its content (dynamic sizing). A sheet mounted already open starts at index 0, because `expand()` before Gorhom has laid out is ignored.
- Backdrop is `BottomSheetBackdrop` at opacity 0.2 (the `backdrop` token); tapping it closes.

**Placement matters.** A sheet drawn inside a tab screen is under the glass tab bar. Render it in the tabs layout, or open it with `useSheet()` below.

## `SheetProvider` and `useSheet()`

`src/components/sheet-host.tsx`. The way for any screen to open a sheet **above** the tab bar.

```tsx
const { present, dismiss } = useSheet();

present((sheet) => (
  <ActionSheet {...sheet} title="Actions" actions={[...]} />
));
```

- `present(render)` stores a render function and opens it. `render` receives `SheetRenderProps`: `isOpen`, `onOpenChange`, `blurTarget`. Spread them onto the sheet (`{...sheet}`).
- `dismiss()` closes the current sheet.
- `SheetProvider` is mounted in `(tabs)/_layout.tsx` after the tabs, with the layout's `blurTarget`, and renders the current sheet after its children. The sheet stays mounted after closing so the close animation can play. Each `present` mounts a fresh sheet (a new React key), so a sheet never keeps the previous one's state: editing record B after A shows B.
- Use it from tab screens. A pushed screen (settings, detail) covers the tab bar already and may render a sheet inline.
- One hosted sheet at a time. For a sheet with its own state (a form), make the content a component with its own `useState` and render that inside the `GlassSheet`.
- `useSheet()` throws outside `SheetProvider`, so it works only inside `(tabs)`.

## `ActionSheet`

`src/components/action-sheet.tsx`. A `GlassSheet` that lists actions, like an iOS action sheet.

| Prop                                   | Meaning                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `isOpen`, `onOpenChange`, `blurTarget` | As `GlassSheet` (spread `{...sheet}` from `useSheet`)                               |
| `title`                                | Optional header title                                                               |
| `actions`                              | `ActionSheetAction[]`: `key`, `label`, `icon` (Ionicons), `destructive?`, `onPress` |

One `SettingsRow` per action (no chevron). Pressing a row closes the sheet first, then runs `onPress`. Put destructive actions last; they use the danger tone. Confirm them (`useConfirmDelete()`) inside `onPress`.

## `PermissionSheet`

`src/components/permission-sheet.tsx`. Explains a permission **before** the system prompt, so the prompt has context.

| Prop                            | Meaning                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `isOpen`, `onAllow`, `onNotNow` | Allow should call the system request; Not Now and any dismissal call `onNotNow`              |
| `icon`                          | Ionicons glyph on a soft-accent tile (default `notifications`)                               |
| `title`, `message`              | Defaults to the notification texts (`permission.notificationsTitle`, `notificationsMessage`) |
| `blurTarget`                    | As above                                                                                     |

Flow used by Settings and the Components tab: tap the row, show the sheet; Allow calls `requestNotificationPermission`, then a success or info toast. See [notifications.md](notifications.md). The sheet does not know about `useSheet`; spread `{...sheet}` in a `present` render function (its `onOpenChange` is ignored and `onNotNow` handles dismissal).

## Glass toast

`src/lib/glass-toast.tsx`. The app's one toast: a 54 pt glass pill, shown for 4 seconds, with an optional Undo button.

```ts
const show = useGlassToast();
show({ label: "Item deleted", onUndo: () => undo() });
```

| Option        | Meaning                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `label`       | What happened                                                                                                                            |
| `description` | A second muted line (two lines max)                                                                                                      |
| `tone`        | `default`, `success`, `warning`, `danger`: adds a status icon in the semantic colour                                                     |
| `onUndo`      | Adds the Undo button; runs at most once and closes the toast                                                                             |
| `aboveTabBar` | For a pushed screen that is about to go back to the tabs (the detail screen's Delete): place it above the tab bar where the user will be |

- Entering and exiting animations (spring in, fade out) are skipped when Reduce Motion is on.
- Each toast is announced to screen readers (`announceForAccessibility`) and the pill is a polite live region.
- A new toast replaces the current one.
- Two providers exist: the root layout's (every screen, positioned above the bottom safe area) and the tabs layout's (inside the tabs, above the tab bar, with the `blurTarget`). The inner one wins inside the tabs.
- `useNotify()` is the shortcut for plain outcomes, see [feedback-and-states.md](feedback-and-states.md).

## Context menu (long press)

`src/components/context-menu.tsx`. The iOS-style long-press menu: the pressed row lifted above a blurred scrim and a glass menu of commands.

```ts
const openMenu = useContextMenu();
openMenu({ rect, preview: <RowContent />, label: "Actions for Groceries", items: [...] });
```

`ContextMenuState`:

| Field     | Meaning                                                                      |
| --------- | ---------------------------------------------------------------------------- |
| `rect`    | Where the row is on screen; `SwipeableRow`'s `onLongPress(rect)` provides it |
| `preview` | The row drawn again above the scrim at the same place                        |
| `items`   | `ContextMenuItem[]`: `key`, `label`, `icon`, `destructive?`, `onPress`       |
| `label`   | Accessibility label of the menu ("Actions for Groceries")                    |

Behaviour:

- Menu: 256 wide, 6 pt padding, 44 pt items, corners `rounded-3xl`, glass background, `menu` and `menuitem` roles. A destructive item that is not first gets a separator before it (destructive items come last).
- Position: below the row when it fits, else above it; when neither fits, the lifted row moves up so the menu fits below (like iOS). Horizontally it follows the row, kept 14 pt from the screen edge.
- Scrim: a blur (intensity 18) plus the palette `scrim` tint; no blur with Reduce Transparency (or Android without a `blurTarget`). A tap on the scrim, or Android back, closes it. The container is `accessibilityViewIsModal`.
- Selecting an item closes the menu, then runs `onPress`.
- Fades in over 180 ms and out over 150 ms; no animation with Reduce Motion.
- `ContextMenuProvider` is mounted in `(tabs)/_layout.tsx`. `useContextMenu()` throws outside it. On a pushed screen, use HeroUI's `Menu` on a header button instead (the detail screen does); it is portalled and anchored to its trigger.

See [lists-and-gestures.md](lists-and-gestures.md) for the row that triggers it.
