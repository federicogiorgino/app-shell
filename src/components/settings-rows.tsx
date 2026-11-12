import { Ionicons } from "@expo/vector-icons";
import { ListGroup, Separator, Spinner, Switch, Tabs, useThemeColor } from "heroui-native";
import {
  Children,
  Fragment,
  isValidElement,
  type ComponentProps,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";
import { Text, View } from "react-native";

import { Tile, TILE_SIZE } from "@/components/fields";
import { GUTTER } from "@/lib/metrics";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** The gap between a row's leading tile and its text (`gap: 12px` in `heroui-overrides.css`). */
const LEADING_GAP = 12;
/** Where a row's text starts when it has a leading tile; without one it starts at `GUTTER`. */
export const TEXT_INSET_WITH_LEADING = GUTTER + TILE_SIZE + LEADING_GAP;

/* ============================================================================
 * SettingsRow: the one row
 * ========================================================================== */

export interface SettingsRowProps {
  /** Optional only for a full-width `control` (a segmented control with no label). */
  title?: string;
  description?: string;
  /** A glyph on an icon tile. */
  icon?: IconName;
  /** Custom leading content (a colour swatch), drawn in the same column as the tile. */
  leading?: ReactNode;
  /** Trailing text or a node, before the chevron. */
  value?: ReactNode;
  /** Makes the row pressable. It shows a chevron unless `chevron` is false. */
  onPress?: () => void;
  /**
   * Turns the row into a radio option: a checkmark when true, none when false, and the radio
   * role and selected state for screen readers.
   */
  selected?: boolean;
  /** `danger` colours the title and the tile. Keep it for destructive rows. */
  tone?: "default" | "danger";
  disabled?: boolean;
  /** A spinner in place of the trailing accessory; the row ignores presses meanwhile. */
  loading?: boolean;
  /** Overrides the chevron (shown by default for a pressable row that is not an option). */
  chevron?: boolean;
  /**
   * A trailing control (a switch). The row itself is then not pressable, so VoiceOver and
   * TalkBack reach the control, not the row.
   */
  control?: ReactNode;
  /** `fill` stretches the control across the row below no label, as a full-width segmented control. */
  controlLayout?: "trailing" | "fill";
  accessibilityLabel?: string;
  /**
   * Draws the separator below this row (default true). It is read by `SettingsSection`, which
   * draws the line; the last row of a group never has one. Set false to run two rows together.
   */
  separatorShown?: boolean;
}

/** Whether a row draws a leading column, which decides where its separator starts. */
function hasLeading(props: Pick<SettingsRowProps, "icon" | "leading">): boolean {
  return Boolean(props.icon ?? props.leading);
}

/**
 * The one settings row. Every other row (`SettingsLinkRow`, `SettingsSwitchRow`,
 * `SettingsSegmentRow`) and every picker option is this component with different props, so
 * heights, paddings and columns line up everywhere. Put rows inside a `SettingsSection`, which
 * draws the separators.
 */
export function SettingsRow({
  title,
  description,
  icon,
  leading,
  value,
  onPress,
  selected,
  tone = "default",
  disabled,
  loading,
  chevron,
  control,
  controlLayout = "trailing",
  accessibilityLabel,
}: SettingsRowProps): JSX.Element {
  const [muted, accent] = useThemeColor(["muted", "accent"]);
  const isOption = selected !== undefined;
  const isControl = control !== undefined;
  const pressable = Boolean(onPress) && !isControl;
  const showChevron = chevron ?? (pressable && !isOption);
  const danger = tone === "danger";

  const leadingNode = leading ?? (icon ? <Tile icon={icon} tone={tone} /> : null);

  if (isControl && controlLayout === "fill" && !title) {
    return (
      <ListGroup.Item disabled accessible={false}>
        <View className="min-w-0 flex-1">{control}</View>
      </ListGroup.Item>
    );
  }

  return (
    <ListGroup.Item
      onPress={pressable && !loading ? onPress : undefined}
      disabled={disabled || !pressable}
      // A control row hides itself from screen readers so the control is the target.
      accessible={isControl ? false : undefined}
      accessibilityRole={isOption ? "radio" : pressable ? "button" : undefined}
      accessibilityState={{ selected: isOption ? selected : undefined, busy: loading }}
      accessibilityLabel={accessibilityLabel}
    >
      {leadingNode ? (
        <ListGroup.ItemPrefix>
          <View style={{ width: TILE_SIZE }} className="items-center">
            {leadingNode}
          </View>
        </ListGroup.ItemPrefix>
      ) : null}
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle className={danger ? "text-danger" : undefined}>
          {title}
        </ListGroup.ItemTitle>
        {description ? <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription> : null}
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix className="flex-row items-center gap-2">
        {typeof value === "string" ? <Text className="text-body text-muted">{value}</Text> : value}
        {loading ? <Spinner size="sm" /> : null}
        {!loading && isOption && selected ? (
          <Ionicons name="checkmark" size={20} color={accent} />
        ) : null}
        {!loading && showChevron ? (
          <Ionicons name="chevron-forward-outline" size={16} color={muted} />
        ) : null}
        {control}
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );
}

/* ============================================================================
 * SettingsSection: the group and its separators
 * ========================================================================== */

/** The row elements of `children`, looking through fragments and skipping `false` and `null`. */
function rowElements(children: ReactNode): ReactElement<Partial<SettingsRowProps>>[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) {
      return rowElements((child.props as { children?: ReactNode }).children);
    }
    return [child as ReactElement<Partial<SettingsRowProps>>];
  });
}

/**
 * A titled group of rows, like an iOS Settings group. It draws a separator between rows, as iOS
 * does: it starts where the row above puts its text (under the tile's right edge when the row
 * has an icon, at the row's edge when it has none) and runs to the group's right edge.
 */
export function SettingsSection({
  title,
  footer,
  children,
}: {
  title?: string;
  /** A hint under the group. */
  footer?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const rows = rowElements(children);
  return (
    <View className="gap-2">
      {title ? (
        <Text
          accessibilityRole="header"
          className="px-2 text-caption font-semibold tracking-wider text-muted uppercase"
        >
          {title}
        </Text>
      ) : null}
      <ListGroup
        className="rounded-xl shadow-none"
        accessibilityRole={
          rows.some((row) => row.props.selected !== undefined) ? "radiogroup" : undefined
        }
      >
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && rows[index - 1].props.separatorShown !== false ? (
              <Separator
                style={{
                  marginStart: hasLeading(rows[index - 1].props) ? TEXT_INSET_WITH_LEADING : GUTTER,
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </ListGroup>
      {footer}
    </View>
  );
}

/** A hint under a group. */
export function SettingsHint({ children }: { children: ReactNode }): JSX.Element {
  return <View className="gap-2 px-4">{children}</View>;
}

/* ============================================================================
 * Thin wrappers over SettingsRow
 * ========================================================================== */

/** A row that opens a screen or runs an action: tile, title, optional value and a chevron. */
export function SettingsLinkRow(
  props: Omit<SettingsRowProps, "control" | "controlLayout" | "selected"> & {
    onPress: () => void;
  }
): JSX.Element {
  return <SettingsRow {...props} />;
}

/** A row whose control is a switch. */
export function SettingsSwitchRow({
  value,
  onChange,
  title,
  disabled,
  ...rest
}: Omit<SettingsRowProps, "control" | "controlLayout" | "onPress" | "selected" | "value"> & {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}): JSX.Element {
  const [defaultColor, success] = useThemeColor(["default", "success"]);
  return (
    <SettingsRow
      {...rest}
      title={title}
      disabled={disabled}
      control={
        <Switch
          isSelected={value}
          onSelectedChange={onChange}
          isDisabled={disabled}
          accessibilityLabel={title}
          // Success when on, like iOS switches.
          animation={{ backgroundColor: { value: [defaultColor, success] } }}
        />
      }
    />
  );
}

/**
 * A segmented control. With a `title` (and usually an `icon`) it sits at the end of the row;
 * without one it fills the whole row.
 */
export function SettingsSegmentRow<Value extends string>({
  options,
  value,
  onChange,
  disabled,
  ...rest
}: Omit<SettingsRowProps, "control" | "controlLayout" | "onPress" | "selected" | "value"> & {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}): JSX.Element {
  const fill = !rest.title;
  return (
    <SettingsRow
      {...rest}
      disabled={disabled}
      controlLayout={fill ? "fill" : "trailing"}
      control={
        <View className={fill ? undefined : "w-40"}>
          <Tabs value={value} onValueChange={(next) => onChange(next as Value)} variant="primary">
            <Tabs.List>
              <Tabs.Indicator />
              {options.map((option) => (
                <Tabs.Trigger
                  key={option.value}
                  value={option.value}
                  isDisabled={disabled}
                  className="flex-1"
                >
                  <Tabs.Label numberOfLines={1}>{option.label}</Tabs.Label>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        </View>
      }
    />
  );
}

/** A radio option: a checkmark when selected. Put several in one `SettingsSection`. */
export function SettingsOptionRow(
  props: Omit<SettingsRowProps, "control" | "controlLayout" | "chevron" | "selected"> & {
    selected: boolean;
    onPress: () => void;
  }
): JSX.Element {
  return <SettingsRow {...props} />;
}
