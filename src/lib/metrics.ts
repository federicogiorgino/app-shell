/**
 * Sizes for the few places that must use `style` instead of classes: Pressable
 * style functions, swipe panels and third-party components. They mirror the tokens in
 * `global.css` and `heroui-overrides.css`; change both together. Everywhere
 * else, use the classes.
 */

/** The radius scale: `rounded-2xl`, `rounded-3xl`, `rounded-sheet`. */
export const RADIUS = { "2xl": 16, "3xl": 24, sheet: 42 } as const;

/** A list row (`ListGroup.Item`) and a large button. */
export const ROW_HEIGHT = 54;

/** A menu item. */
export const MENU_ITEM_HEIGHT = 44;

/**
 * Width of a HeroUI `Menu.Content`. Always pass one: its item titles are `flex: 1`, so a menu
 * sized to its content draws them at zero width and looks empty.
 */
export const MENU_WIDTH = 240;

/** Side padding inside rows and the page gutter (`px-4`). */
export const GUTTER = 16;
