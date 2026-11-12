# Feedback and screen states

How the app tells the user what happened and what state a screen is in. Every data screen has four states: loading, error, empty and success. These components cover them, so no screen builds a one-off version.

| Need                                          | Use                                   | Where                                 |
| --------------------------------------------- | ------------------------------------- | ------------------------------------- |
| An outcome the user need not act on ("Saved") | `useNotify()`                         | `src/lib/use-notify.ts`               |
| A reversible action ("Deleted", Undo)         | `useGlassToast()` with `onUndo`       | `src/lib/glass-toast.tsx`             |
| A decision before something happens           | `useConfirm()` / `useConfirmDelete()` | `src/components/confirm-provider.tsx` |
| Pick one of several actions                   | `ActionSheet` via `useSheet()`        | [glass.md](glass.md)                  |
| Nothing to show yet                           | `EmptyState`                          | `src/components/empty-state.tsx`      |
| A read failed                                 | `DataError` (wraps `ErrorScreen`)     | `src/components/data-error.tsx`       |
| Any other failure screen                      | `ErrorScreen`                         | `src/components/error-screen.tsx`     |
| Waiting for a local read                      | `ScreenLoading`                       | `src/components/screen-loading.tsx`   |
| The device is offline                         | `OfflineBanner`                       | `src/components/offline-banner.tsx`   |
| The app is starting                           | `LaunchScreen`                        | `src/components/launch-screen.tsx`    |

Never use `Alert.alert` for either feedback or confirmation.

Rule of thumb: a toast for "it worked" or "it failed", a dialog for "are you sure".

## `useNotify()`

Short, non-blocking toasts. It is a thin layer over the glass toast:

```ts
const notify = useNotify();
notify.success("Saved");
notify.error("Couldn't save", "Check your connection and try again.");
notify.info("Retried");
notify.warning("Almost full");
```

Each method is `(label: string, description?: string) => void`. The tones map to `default` (info), `success`, `warning`, `danger` (error) and add a status icon. Keep the status colours for their meaning: a success toast means something succeeded. The returned object is memoised. Toast behaviour (duration, replacement, announcements, Reduce Motion) is in [glass.md](glass.md#glass-toast).

Use `getErrorMessage(error)` (`src/lib/api.ts`) for the description of a failed request.

## Confirmations

`ConfirmProvider` is mounted in the root layout, so `useConfirm()` works on every screen, including pushed ones. It shows a HeroUI `Dialog` (portalled, `rounded-4xl`, 24 pt padding, headline title) and returns a promise.

```ts
const confirm = useConfirm();
const ok = await confirm({
  title: "Delete note?",
  message: "This can't be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Keep", // default: common.cancel
  destructive: true, // danger-coloured confirm button
});
```

| Option         | Default          | Meaning                                           |
| -------------- | ---------------- | ------------------------------------------------- |
| `title`        | required         | Dialog title                                      |
| `message`      | none             | Description under the title                       |
| `confirmLabel` | `common.confirm` | Confirm button label                              |
| `cancelLabel`  | `common.cancel`  | Cancel button label                               |
| `destructive`  | `false`          | Confirm button uses `danger` instead of `primary` |

Resolves `true` on confirm, `false` on cancel, tapping the overlay or swiping the dialog away. A second `confirm()` while one is open replaces the first, which resolves `false`. The hook throws outside the provider.

### `useConfirmDelete()`

The preset for the common case: `confirmDelete(title, message?)` is `confirm` with `destructive: true` and the label `common.delete`.

```ts
const confirmDelete = useConfirmDelete();
if (await confirmDelete(t("note.deleteTitle"), t("note.deleteMessage"))) {
  await remove();
}
```

Guidance: confirm destructive actions that cannot be restored (account deletion, wiping data). For deletions that can be undone (soft-deleted records), prefer an immediate delete with an Undo toast, as the demo list does; the detail screen's Delete uses a confirmation because it also leaves the screen.

## `EmptyState`

A centred block for empty lists and placeholder screens.

| Prop                      | Meaning                                  |
| ------------------------- | ---------------------------------------- |
| `icon`                    | Ionicons name (40 px, muted)             |
| `title`                   | Heading (`h4`, centred)                  |
| `description`             | Optional muted paragraph                 |
| `actionLabel`, `onAction` | Both required to show a secondary button |

## `ErrorScreen`

An error state built only from React Native primitives and theme classes, so it still renders when the error happened **above** the HeroUI provider (it is what the root error boundary shows).

| Prop                      | Meaning                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `title`, `message`        | Texts (the message is optional)                                                                                               |
| `actionLabel`, `onAction` | The one button (an accent pill)                                                                                               |
| `icon`                    | Optional glyph on a soft-warning tile                                                                                         |
| `busyLabel`               | If set, the button reads this for 800 ms after a press ("Trying…") and ignores presses meanwhile, so a quick retry is visible |
| `layout`                  | `screen` (default; fills the screen, centred) or `inline` (sits under a screen's header)                                      |

## `DataError`

`ErrorScreen` preconfigured for failed local reads: an alert icon, "Can't read your data", a Try Again button that shows "Trying…". Props: `onRetry` and `layout` (`inline` by default; `screen` for the root error boundary). Every screen that reads the local store shows this one.

The retry pattern: keep an `attempt` counter and put it in the live-query key so bumping it re-runs the query:

```ts
const [attempt, setAttempt] = useState(0);
const query = useLiveQuery(["item"], `items:${attempt}`, listItems);
// ... <DataError onRetry={() => setAttempt((n) => n + 1)} />
```

## `ScreenLoading`

The one loading state for screens that read the local store. It does not imitate the content: it renders **nothing for 300 ms** (a local read usually finishes first, so nothing flashes), then a centred `Spinner`. The wrapper is a `progressbar` with the label `common.loading` and `busy: true`. The screen keeps its header in place, so nothing shifts when the data arrives.

## `OfflineBanner`

A warning pill at the top of the screen (below the status bar) while `expo-network` reports no connection or no internet reachability. It shows only once offline is known (an unknown state shows nothing), ignores touches (`pointerEvents="none"`) and is a polite live region. Mounted once in `RootStack`. Text: `offline.banner`.

## `LaunchScreen`

Takes over from the native splash while the stored session is read (the auth gate's `loading` state): the app mark (`assets/images/splash-icon.png` / `splash-icon-dark.png`, centred at the same size as the native splash so the hand-over has no jump), the app name, "Loading" and a spinner. It fades out over 400 ms (no fade with Reduce Motion). It is a `progressbar` with `busy: true`. Replace the images in `assets/images` and the splash settings in `app.config.ts` together.

## The four states in a screen

```tsx
if (query.status === "loading") return <LargeTitleScreen title={t("x.title")}><ScreenLoading /></LargeTitleScreen>;
if (query.status === "error")   return <LargeTitleScreen title={t("x.title")}><DataError onRetry={retry} /></LargeTitleScreen>;
if (query.data.length === 0)    return <LargeTitleScreen title={t("x.title")}><EmptyState .../></LargeTitleScreen>;
return <LargeTitleScreen title={t("x.title")}>{/* the content */}</LargeTitleScreen>;
```

Keep the header (`LargeTitleScreen`) in every branch so the screen does not jump.
