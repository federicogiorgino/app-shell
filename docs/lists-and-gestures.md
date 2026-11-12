# Lists and gestures

`src/components/swipeable-row.tsx` and the long-press menu. For the menu itself see [glass.md](glass.md#context-menu-long-press).

## `SwipeableRow`

A list row with the iOS gestures, built on Gesture Handler's `ReanimatedSwipeable`.

| Gesture                                    | Behaviour                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Tap                                        | Closes an open row; otherwise runs `onPress`                                            |
| Long press (470 ms)                        | Closes any open row, measures the row (`measureInWindow`) and calls `onLongPress(rect)` |
| Swipe right                                | Reveals the leading action; passing the commit point (96 pt) runs it and the row closes |
| Swipe left                                 | Reveals the trailing buttons (78 pt each)                                               |
| Long swipe left (`fullSwipe`, past 215 pt) | The other buttons fold away and the **last** trailing action runs                       |

### Props (`SwipeableRowProps`)

| Prop                        | Meaning                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `children`                  | The row content. It sits in a `bg-surface` `Pressable`, so give it no background of its own |
| `onPress`                   | Tap                                                                                         |
| `onLongPress(rect)`         | Long press; pass `rect` to `useContextMenu()`                                               |
| `accessibilityLabel`        | The row's label for screen readers                                                          |
| `leadingAction`             | One `SwipeAction` behind a right swipe                                                      |
| `trailingActions`           | `SwipeAction[]` behind a left swipe, left to right                                          |
| `fullSwipe`                 | A long left swipe runs the last trailing action (put Delete last)                           |
| `extraAccessibilityActions` | More commands for VoiceOver and TalkBack                                                    |

`SwipeAction`: `key` (also the accessibility action name), `label`, `icon` (Ionicons), `tone` (`accent`, `success`, `warning`, `danger`, `default`: semantic colours with their foreground, so they follow the theme), `onAction`.

`RowRect`: `{ x, y, width, height }` in window coordinates.

### Rules built in

- **One open row at a time.** Opening a row closes the previous one. `closeOpenRow()` (exported) closes the open row and returns `true` if one was open. Call it when the list scrolls: `scrollViewProps={{ onScrollBeginDrag: () => void closeOpenRow() }}`.
- **Vertical scrolling wins first.** The row starts a swipe only after 20 pt of sideways travel (twice the scroll view's own start distance), so a slightly slanted scroll does not get caught by the row.
- **Every action is an accessibility action.** The leading, trailing and extra actions are exposed as custom accessibility actions, so VoiceOver and TalkBack can run them without a gesture. Include any action reachable only by long press in `extraAccessibilityActions`.
- **Panels use plain styles**, not classes: they render inside the swipeable's own containers, where class styles were not applied on device.
- The trailing panel is hidden while the row is closed, so the row's anti-aliased edge never shows a hairline of colour at rest.
- Disabled when there is neither a leading nor a trailing action.

### Pattern: a row with all gestures

```tsx
<SwipeableRow
  accessibilityLabel={item.title}
  onPress={() => open(item)}
  onLongPress={(rect) => openMenu({ rect, preview: <RowContent item={item} />, label, items })}
  leadingAction={{
    key: "done",
    label: "Done",
    icon: "checkmark",
    tone: "success",
    onAction: toggle,
  }}
  trailingActions={[
    { key: "edit", label: "Edit", icon: "create-outline", tone: "accent", onAction: edit },
    { key: "delete", label: "Delete", icon: "trash-outline", tone: "danger", onAction: remove },
  ]}
  fullSwipe
  extraAccessibilityActions={[
    { key: "favorite", label: "Favourite", icon: "star-outline", tone: "default", onAction: fav },
  ]}
>
  <RowContent item={item} />
</SwipeableRow>
```

Pair a destructive action with an Undo toast (`useGlassToast` with `onUndo`) or a confirmation (`useConfirmDelete`). Export the row's content as its own component: the context menu draws it again, lifted, as `preview`.

### Haptics

The demo triggers haptics from `useItemActions` (`expo-haptics`): a success notification when completing, a medium impact when deleting. `GlassTabBar` has its own haptic tick while scrubbing.

## Lists

- **Short lists**: put the rows in the `LargeTitleScreen` children (`View` with gaps).
- **Long lists**: pass `list={{ data, renderItem, keyExtractor, footer?, empty? }}` to `LargeTitleScreen`. It renders a virtualized `FlatList` under the header, so only items near the screen stay mounted. See [header.md](header.md).
- **Server lists**: `useInfiniteQuery` with `onEndReached` on the screen (it fires once within 320 pt of the bottom and re-arms when content grows); pull to refresh through `scrollViewProps.refreshControl`, offset by `HEADER_BAR_HEIGHT`. See [api-and-storage.md](api-and-storage.md).
- **Row cards**: the demo wraps each row in `mx-4 mb-2 overflow-hidden rounded-3xl` so the swipe panels are clipped to the card.

## `HeroUI Menu` (the other long-press and tap menu)

For a menu anchored to a button (the detail screen's `⋯`), use HeroUI's portalled `Menu`: `Menu.Trigger asChild` around a `HeaderIconButton`, `Menu.Portal` with `Menu.Overlay` and `Menu.Content presentation="popover" width={MENU_WIDTH}`, items as `Menu.Item` (`variant="danger"` for destructive). **Always pass a `width`** (`MENU_WIDTH` = 240 from `src/lib/metrics.ts`): the item titles are `flex: 1`, so a menu sized to its content draws them at zero width and looks empty.
