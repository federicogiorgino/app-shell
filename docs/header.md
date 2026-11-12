# Header: `LargeTitleScreen`

`src/components/large-title-screen.tsx`. Every screen with a header uses it; never build a custom header or use Expo Router's native header (`headerShown` is `false` for the whole stack).

## What it gives you

- A **large title** (34/41 pt bold) that collapses into a **compact bar** with a centred title and a blur behind it as you scroll, like iOS.
- An automatic **back button**, left and right **action slots**, an optional **eyebrow** and **subtitle**, and an optional **hero** above the title.
- Content that scrolls under the glass header and above the glass tab bar, with the right bottom padding.
- Infinite-list, pull-to-refresh and virtualized-list support.
- It scrolls with `Animated.ScrollView` (or `Animated.FlatList`); children are the screen's content.

## Basic usage

```tsx
import { HeaderIconButton, LargeTitleScreen } from "@/components/large-title-screen";

export default function NotesScreen() {
  const { t } = useTranslation();
  return (
    <LargeTitleScreen
      title={t("notes.title")}
      subtitle={t("notes.subtitle")}
      rightContent={<HeaderIconButton icon="add" label={t("notes.new")} onPress={openComposer} />}
    >
      <View className="gap-4 px-4">{/* content */}</View>
    </LargeTitleScreen>
  );
}
```

`LargeTitleScreen` owns the scroll view; pass the content as `children`. Several header buttons: wrap them in `<View className="flex-row gap-2">`.

Inside the glass tabs it forwards scroll events to the tab bar (scroll down minimizes it) and pads the content so the last item clears the bar. Outside the tabs (a pushed screen) both are no-ops. Nothing needs configuring.

## Props (`LargeTitleScreenProps<T>`)

| Prop              | Type                | Meaning                                                                                                                                                            |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`           | string              | The large title, also shown in the compact bar                                                                                                                     |
| `eyebrow`         | string              | Small uppercase muted line above the title ("10 entries · 3 reviews")                                                                                              |
| `subtitle`        | string              | A muted line under the title (15 pt)                                                                                                                               |
| `wrapTitle`       | boolean             | A long title: 28 pt and wrapping onto as many lines as needed. Default: 34 pt, at most two lines                                                                   |
| `hero`            | node                | Full-bleed content above the large title (artwork, a colour block). It starts under the status bar and the header buttons float over it until the header collapses |
| `leftContent`     | node                | Rendered after the automatic back button                                                                                                                           |
| `rightContent`    | node                | Trailing actions; use `HeaderIconButton`s (wrap several in a `flex-row gap-2` view)                                                                                |
| `showBackButton`  | boolean             | Force the back button on or off. Default: shown when an enclosing stack can pop                                                                                    |
| `onEndReached`    | function            | Called once each time the user scrolls within 320 pt of the bottom; re-arms when the content grows. Load the next page here                                        |
| `scrollViewProps` | `ScrollViewProps`   | Extra scroll props (`refreshControl`, `onScrollBeginDrag`, ...) minus `children` and `onScroll`. `style` and `contentContainerStyle` are merged                    |
| `list`            | `LargeTitleList<T>` | Render a virtualized list instead of one scroll view                                                                                                               |
| `children`        | node                | The content, below the title. With `list`, it renders above the items (pass `{null}` if there is none)                                                             |

### `LargeTitleList<T>`

| Field                | Meaning                                   |
| -------------------- | ----------------------------------------- |
| `data`               | `readonly T[]`                            |
| `renderItem(item)`   | Returns the row element                   |
| `keyExtractor(item)` | A stable string key                       |
| `footer`             | After the items (a "Show older" button)   |
| `empty`              | Instead of the items when `data` is empty |

The list is a virtualized `FlatList` (`initialNumToRender 6`, `maxToRenderPerBatch 4`, `windowSize 7`) so only items near the screen stay mounted, which keeps swipeable rows cheap. Pass the item type: `<LargeTitleScreen<Item> list={...}>`.

## `HeaderIconButton`

A 36 pt round glass button with an 18 pt Ionicons glyph and a 44 pt touch target, matching the back button.

| Prop         | Meaning                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `icon`       | Ionicons name                                                                                                      |
| `label`      | Accessibility label (required for screen readers, since the button has no text)                                    |
| `onPress`    | Press handler. Optional only when a HeroUI trigger with `asChild` supplies it (the detail screen's `Menu.Trigger`) |
| `tone`       | `default`, `accent`, `danger` (tint the glyph) or `fill` (a solid accent button: a sheet's confirm)                |
| `isDisabled` | Disabled state                                                                                                     |
| `ref`        | Forwarded, for HeroUI triggers that measure the button to place a menu                                             |

It presses with a spring (scale), and is also what `GlassSheet` uses for its cancel and confirm buttons.

## Back button

`useStackBack` finds the **nearest enclosing stack navigator that can pop** and pops that same stack. Tab history is deliberately skipped, so a tab root never shows a back button, and a screen pushed over the tabs always shows one. It listens to `focus` and `state` events, so it updates when the stack changes. Override with `showBackButton`.

## How the collapse works

1. On every scroll frame the large-title block measures its own position on screen (so anything above it, like a hero, is accounted for automatically).
2. It fades and lifts out between two distances below the top safe-area inset: `[36, 8]` for a plain title, `[20, -8]` when there is an eyebrow or subtitle, and writes the 0 to 1 collapse progress into a shared value `compact`.
3. `compact` drives the compact title (fades and rises in) and the header blur (fades in).
4. Past a 0.5 threshold the large title is hidden from screen readers (`collapsed`), so the title is announced once, from the compact bar.
5. When the content gets shorter (a filter leaves a short list), the scroll offset is clamped, and the title is measured again two frames later, so the title cannot stay stuck collapsed.

## Layout constants

| Constant                     | Value                                                             | Meaning                                            |
| ---------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Compact bar height           | 56 pt below the safe-area inset (exported as `HEADER_BAR_HEIGHT`) | Offset pull-to-refresh spinners with it            |
| Action target                | 44 pt                                                             | Minimum touch size                                 |
| Action padding               | 14 pt                                                             | Horizontal padding of the action bar               |
| Content bottom padding       | 32 pt + the tab bar inset                                         | So the last row clears the bar                     |
| `END_REACHED_OFFSET`         | 320 pt                                                            | Distance from the bottom that fires `onEndReached` |
| Compact title font scale cap | 1.3                                                               | The fixed-height bar does not grow past this       |

The compact title is inset symmetrically so it never runs under the wider of the two action slots (the slots' widths are measured).

## Hero

`hero` renders above the title, inside the scroll content, starting at the very top of the screen (no top padding). The action buttons are glass circles, so they stay legible over any artwork. Give a hero a fixed height (`h-64` in the demo) and mark decorative content `accessibilityElementsHidden`. When there is a hero, the title block gets `pt-4`.

### A hero example

```tsx
function Hero() {
  const accent = useThemeColor("accent");
  const background = useThemeColor("background");
  return (
    <View
      className="h-80 justify-end px-5 pb-2"
      style={{
        experimental_backgroundImage: `linear-gradient(to bottom, ${accent} 0%, ${background} 100%)`,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* cover art, image, illustration */}
    </View>
  );
}

<LargeTitleScreen title={game.name} eyebrow={game.studio} subtitle={game.genre} hero={<Hero />}>
```

Fade the hero into `background` at its bottom edge so it blends with the content. Keep meaningful images labelled for screen readers.

## The header blur

The compact bar's background is an expo-blur `BlurView` at `GLASS_BLUR_INTENSITY` (60) with a 10% `bg-background` wash, the same material as every glass surface. It is invisible while the large title shows and fades in as it collapses (a wrapping `Animated.View` fades; the `BlurView`'s `intensity` is never animated, because it resets after mount). On Android 12+ it blurs through the screen's own `BlurTargetView`; older Android shows the wash only.

## Tuning

All in `large-title-screen.tsx`:

| Constant                                   | Default                                | Effect                                                                       |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------- |
| `BAR_HEIGHT`                               | 56                                     | Compact bar height below the status bar                                      |
| `FADE_RANGES`                              | `plain [36, 8]`, `supporting [20, -8]` | Where the large title starts and finishes fading, in pt below the status bar |
| `BOTTOM_PADDING`                           | 32                                     | Space under the last item (added to the tab bar inset)                       |
| `END_REACHED_OFFSET`                       | 320                                    | Distance from the bottom that fires `onEndReached`                           |
| `COLLAPSED_THRESHOLD`                      | 0.5                                    | When the title counts as collapsed for screen readers                        |
| `bg-background opacity-10` in `HeaderBlur` | 10%                                    | How solid the bar is                                                         |

## Tab bar integration

Inside the glass tabs the screen:

- adds the bar's height to its bottom padding (`useGlassTabBarInset`), and the iOS scroll indicator insets,
- feeds scroll events to `useMinimizeOnScroll`, so scrolling down shrinks the tab bar,
- paints its own background (`bg-background`) because Android blurs a snapshot of the content and fills unpainted pixels black.

Pushed screens (outside the tabs) get none of the tab-bar behaviour and no bottom inset.

## Wrapping the content in `BlurTargetView`

The scroll view is wrapped in expo-blur's `BlurTargetView` (its own ref) so the header's blur works on Android, separately from the tabs layout's target for the tab bar.

## Rules

- Keep the header in **every** state of a screen (loading, error, empty), so nothing jumps.
- A new screen outside `(tabs)` must be registered in `src/app/_layout.tsx` inside the signed-in `Stack.Protected` group.
- Put titles, subtitles and button labels through `t()`. Title text is read from `title`; do not render the title again inside the content.
- Use `HeaderIconButton` for actions so they match the back button; give each a `label`.

## Troubleshooting

| Symptom                                      | Cause and fix                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The header or tab bar looks black on Android | Android blurs a snapshot of the `BlurTargetView`'s inner view and fills unpainted pixels black. Whatever is inside the target must paint its own background (`LargeTitleScreen` does on its scroll view, the tabs layout on `TabSlot`). A background on the `BlurTargetView` itself does not help |
| The blur shows before scrolling              | Do not animate `BlurView`'s `intensity`; fade a wrapping `Animated.View`                                                                                                                                                                                                                          |
| No blur on Android                           | No `blurTarget`, or Android older than 12                                                                                                                                                                                                                                                         |
| Empty space at the bottom of a pushed screen | It is not; `useGlassTabBarInset()` returns 0 outside the tabs. If you see tab-bar padding, the screen is rendered inside the tabs                                                                                                                                                                 |
| A new route is unknown to typecheck          | Typed routes are generated when Expo starts; start it once                                                                                                                                                                                                                                        |
