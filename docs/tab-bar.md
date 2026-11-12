# Glass tab bar

`src/components/glass-tabs.tsx` and `src/app/(tabs)/_layout.tsx`. A floating Liquid Glass tab bar for Expo Router's headless tabs (`expo-router/ui`), adapted from `expo-glass-tabs` (MIT, David Mokos).

Changes from the original: the stacked-blur "progressive blur" behind the bar was removed (it banded) and replaced by an optional single-gradient `edgeFade`; the glass material is the app's shared `GlassSurface`, so it follows Reduce Transparency; the theme only carries tints and the selection pill.

## Anatomy

- A **pill** (the glass capsule) holding the tab buttons, floating above the bottom safe area with a 12 pt margin from the screen edges.
- A sliding **selection highlight** behind the active tab (a capsule that springs between tabs).
- An optional round **action button** beside the pill (the demo's quick add), glass or filled with a colour.
- **Scrubbing**: press and drag across the pill to move the highlight; releasing selects the tab under the finger (with a haptic tick on iOS when `haptics` is on).
- **Minimize on scroll**: scrolling down shrinks the bar (icons only, narrower, shorter); scrolling up or being near the top expands it.

## Setup in `(tabs)/_layout.tsx`

```tsx
<TabBarMinimizeProvider>
  <Tabs options={{ backBehavior: "firstRoute" }}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1, backgroundColor: background }} renderFn={renderFadingTabScreen} />
    </BlurTargetView>
    <TabList asChild>
      <GlassTabBar onIndexSelected={(i) => router.navigate(ITEMS[i].href)} blurTarget={blurTarget} action={...} theme={...} haptics>
        {ITEMS.map(... <TabTrigger name href asChild><GlassTabButton item={...} index={i} /></TabTrigger>)}
      </GlassTabBar>
    </TabList>
  </Tabs>
</TabBarMinimizeProvider>
```

`TabBarMinimizeProvider` must wrap everything that uses the bar or `useMinimizeOnScroll`; `GlassTabBar` throws without it. The tab files in `(tabs)` are `index.tsx` and `components.tsx`, matching `TabTrigger name`.

### Adding or removing a tab

1. Add the route file in `src/app/(tabs)/`.
2. Add an entry to `ITEMS` (`name` = file name, `href`, an i18n `label` key, an Ionicons `icon`). The label type accepts any key of the `tabs` group, so adding the string (next step) is all the typing needed.
3. Add the `tabs.*` string in every language file.
4. Two to five tabs read best.

Every child of `GlassTabBar` is counted as a tab; do not put anything else there (use `action` for the extra button). `onIndexSelected` receives the index in the order of the children. `GlassTabItem` also accepts `icon` (an SF Symbol name via `expo-symbols`), but SF Symbols are iOS-only, so the shell uses `renderIcon` with Ionicons. `renderIcon` is called twice per tab (an inactive and an active tint layer that crossfade), so keep it cheap.

## Exports

### `GlassTabBar`

Props (it extends `TabListProps`):

| Prop                     | Meaning                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onIndexSelected(index)` | A tab was chosen by tap or scrub release; navigate here                                                                                                    |
| `theme`                  | `Partial<GlassTabBarTheme>`: `activeTint`, `inactiveTint`, `highlight` (the selection pill colour). The app passes accent, muted and the palette highlight |
| `haptics`                | A haptic tick while the scrub crosses tab boundaries (iOS)                                                                                                 |
| `edgeFade`               | A solid colour the screen's bottom edge fades into behind the pill (one smooth gradient). Omit for none (the app omits it)                                 |
| `blurTarget`             | Android: the `BlurTargetView` wrapping the screens; without it Android shows the opaque fallback                                                           |
| `action`                 | `GlassTabAction`: a round button beside the pill                                                                                                           |

`GlassTabAction`: `label` (accessibility), `renderIcon({ tint, size })`, `onPress`, `fill` (solid colour, such as the accent, instead of neutral glass), `tint` (icon colour on `fill`).

### `GlassTabButton`

One tab. Props: `item: GlassTabItem` and `index`. `GlassTabItem`: `name`, `label`, `icon` (an SF Symbol name, via `expo-symbols`) or `renderIcon({ tint, size })` for custom glyphs (the app uses Ionicons). Wrap it in `TabTrigger asChild`. Tab labels grow at most 1.2x with Larger Text (the bar is a fixed height).

### `TabBarMinimizeProvider` and `useMinimizeOnScroll()`

The provider holds the minimize progress (a shared value, 0 expanded to 1 minimized). `useMinimizeOnScroll()` returns an animated scroll handler: scrolling down more than 3 pt minimizes, up more than 3 pt expands, and within 24 pt of the top it always expands. Offsets are clamped to the scrollable range so rubber-band overscroll cannot flip the direction. It is a **no-op outside the glass tabs**, so any screen can attach it (`LargeTitleScreen` does this for you). The animation is a critically damped spring (380 ms), retargeted without restarting.

For a scrollable in a tab screen that is not a `LargeTitleScreen`:

```tsx
const minimizeOnScroll = useMinimizeOnScroll();
const bottomInset = useGlassTabBarInset();

<Animated.ScrollView
  onScroll={minimizeOnScroll}
  scrollEventThrottle={16}
  contentContainerStyle={{ paddingBottom: bottomInset + 32 }}
/>;
```

It must be a Reanimated `Animated` scrollable; compose it with your own handler through `useComposedEventHandler`. Scrubbing or tapping the bar expands it again.

### `renderFadingTabScreen`

A drop-in for `TabSlot`'s `renderFn`: expo-router's default tab screen rendering plus a subtle fade and micro-scale (0.985 to 1) when a tab becomes focused. Respects `lazy`, `unmountOnBlur`, `freezeOnBlur`.

### `useGlassTabBarInset()` and `tabBarTop(bottomInset)`

`useGlassTabBarInset()` returns the bottom space the expanded bar covers (the pill plus its gap above the home indicator), or 0 outside the glass tabs. Add it to a scroll view's bottom padding so the last item can scroll clear (`LargeTitleScreen` does). `tabBarTop(bottomInset)` is the same number for a given inset: the toast uses it to float above the bar.

## Dimensions

| What                       | Value                                                           |
| -------------------------- | --------------------------------------------------------------- |
| Expanded height            | 58 pt                                                           |
| Minimized height           | 44 pt, with 34 pt extra inset per side                          |
| Margin to the screen edges | 12 pt                                                           |
| Gap pill to action button  | 10 pt (the action is a circle as tall as the bar)               |
| Icon                       | 21 pt; action icon 24 pt                                        |
| Label                      | 13 pt line, 2 pt gap below the icon (folds away when minimized) |
| Distance above the bottom  | `max(bottom inset - 16, 36)`                                    |
| Slide spring               | 420 ms, damping ratio 0.82 (a tiny settle)                      |

These live in constants at the top of the file; change them in one place.

## The quick-add action

`AppTabBar` passes `action`: a plus icon on a solid accent fill with `accent-foreground` tint, label `tabs.quickAdd`, pressing it calls `useItemSheet().openAdd`. Replace it with your app's main action, or remove `action` for a bar of tabs only.

## Behaviour rules

- Pushed screens (outside `(tabs)`) cover the bar. That is intentional.
- Overlays that must sit above the bar (toast, context menu, sheets) are rendered **after the tabs in the same layout** ([glass.md](glass.md)).
- Reduce Transparency is respected (the bar uses the opaque fallback). The bar's own springs do not read the Reduce Motion setting; they are short and critically damped, and the screen header and overlays do skip their animations with Reduce Motion on.
- Android back from another tab returns to the first tab before leaving the app (`backBehavior: "firstRoute"`).

## Tuning

| Constant                               | Default                              | Effect                                               |
| -------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| `EXPANDED_HEIGHT` / `MINIMIZED_HEIGHT` | 58 / 44                              | Bar (and action circle) height                       |
| `MINIMIZED_INSET`                      | 34                                   | How far the row moves inward per side when minimized |
| `BAR_MARGIN`                           | 12                                   | Gap between the bar and the screen edges             |
| `ACTION_GAP`                           | 10                                   | Space between the pill and the action circle         |
| `MINIMIZE_SPRING` / `SLIDE_SPRING`     | 380 ms, ratio 1 / 420 ms, ratio 0.82 | Minimizing and the sliding highlight                 |

`haptics` defaults to `true`. The tab transition (`renderFadingTabScreen`) is a 220 ms fade; the first screen on launch is not animated.

## Troubleshooting

| Symptom                                                      | Cause and fix                                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scrubbing selects the wrong tab                              | The scrub maths assumes the bar spans the window minus margins, insets and the action circle. If you change the layout, update `getPillWidth` |
| `GlassTabBar must be rendered inside TabBarMinimizeProvider` | Wrap the tabs in the provider                                                                                                                 |
| An overlay opens under the bar                               | It is rendered inside a tab screen. Render it after the tabs in the layout, or open it with `useSheet()`                                      |
