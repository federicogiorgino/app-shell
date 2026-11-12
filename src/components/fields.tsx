import { Ionicons } from "@expo/vector-icons";
import { TagGroup, useThemeColor } from "heroui-native";
import type { ComponentProps, JSX } from "react";
import { Text, View } from "react-native";

/**
 * Glyphs and checks drawn on a data colour (a user-picked colour, applied by `style`) are white.
 * Pick data colours dark enough for white to read on them.
 */
export const ON_DATA_COLOR = "#FFFFFF";

/** Side of the icon tile, which is also the width of every row's leading column. */
export const TILE_SIZE = 30;

/**
 * A glyph on a tile, like an iOS settings row: accent on a soft accent tile, danger on a soft
 * danger tile for destructive rows, or white on a data colour, which is applied by `style`.
 */
export function Tile({
  icon,
  color,
  tone = "default",
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  color?: string;
  tone?: "default" | "danger";
}): JSX.Element {
  const [accent, danger] = useThemeColor(["accent", "danger"]);
  const soft = tone === "danger" ? "bg-danger-soft" : "bg-accent-soft";
  return (
    <View
      className={`items-center justify-center rounded-lg ${color ? "" : soft}`}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        ...(color ? { backgroundColor: color } : null),
      }}
    >
      <Ionicons
        name={icon}
        size={17}
        color={color ? ON_DATA_COLOR : tone === "danger" ? danger : accent}
      />
    </View>
  );
}

/** A small label above a form field or a group of chips. */
export function FieldLabel({ children }: { children: string }): JSX.Element {
  return <Text className="mb-2 text-caption font-semibold text-muted">{children}</Text>;
}

/** Chips with a colour dot: pass one id in `selected` for a single choice, or several. */
export function ColorChips({
  options,
  selected,
  onToggle,
}: {
  options: readonly { id: string; name: string; color: string }[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}): JSX.Element {
  return (
    <TagGroup
      selectionMode="multiple"
      selectedKeys={new Set(selected)}
      onSelectionChange={(keys) => {
        // TagGroup reports the whole set; work out which chip was tapped.
        const next = new Set(Array.from(keys, String));
        const changed = options.find(
          (option) => next.has(option.id) !== selected.includes(option.id)
        )?.id;
        if (changed) onToggle(changed);
      }}
    >
      <TagGroup.List>
        {options.map((option) => (
          <TagGroup.Item key={option.id} id={option.id}>
            <View className="size-2 rounded-full" style={{ backgroundColor: option.color }} />
            <TagGroup.ItemLabel>{option.name}</TagGroup.ItemLabel>
          </TagGroup.Item>
        ))}
      </TagGroup.List>
    </TagGroup>
  );
}
