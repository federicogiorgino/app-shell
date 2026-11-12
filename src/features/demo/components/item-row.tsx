import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ON_DATA_COLOR } from "@/components/fields";
import { SwipeableRow } from "@/components/swipeable-row";

import type { Item } from "../schema";
import { useItemActions } from "../use-item-actions";

/** What a row shows; also drawn lifted above the scrim by the context menu. */
export function ItemRowContent({ item }: { item: Item }): JSX.Element {
  const { t } = useTranslation();
  const warning = useThemeColor("warning");
  return (
    <View className="min-h-16 flex-row items-center gap-3 px-4 py-2.5">
      <View
        className="size-8 items-center justify-center rounded-full"
        style={{ backgroundColor: item.color }}
      >
        {item.done ? <Ionicons name="checkmark" size={18} color={ON_DATA_COLOR} /> : null}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={`text-body font-semibold ${item.done ? "text-muted line-through" : "text-foreground"}`}
        >
          {item.title}
        </Text>
        <Text numberOfLines={1} className="text-caption text-muted">
          {item.note || (item.done ? t("demo.done") : t("demo.noNote"))}
        </Text>
      </View>
      {item.favorite ? (
        <Ionicons name="star" size={16} color={warning} accessibilityLabel={t("demo.favorite")} />
      ) : null}
    </View>
  );
}

/**
 * A demo row with every interaction: tap opens the detail screen, swipe right toggles done,
 * swipe left for Edit and Delete (a long swipe deletes), long press for the context menu.
 */
export function ItemRow({ item }: { item: Item }): JSX.Element {
  const { t } = useTranslation();
  const actions = useItemActions();
  return (
    <SwipeableRow
      accessibilityLabel={item.title}
      onPress={() => actions.open(item)}
      onLongPress={(rect) => actions.openMenu(item, rect, <ItemRowContent item={item} />)}
      leadingAction={{
        key: "toggleDone",
        label: item.done ? t("demo.reopen") : t("demo.markDone"),
        icon: item.done ? "arrow-undo" : "checkmark",
        tone: "success",
        onAction: () => actions.toggleDone(item),
      }}
      trailingActions={[
        {
          key: "edit",
          label: t("common.edit"),
          icon: "create-outline",
          tone: "accent",
          onAction: () => actions.edit(item),
        },
        {
          key: "delete",
          label: t("common.delete"),
          icon: "trash-outline",
          tone: "danger",
          onAction: () => actions.remove(item),
        },
      ]}
      fullSwipe
      extraAccessibilityActions={[
        {
          key: "favorite",
          label: item.favorite ? t("demo.unfavorite") : t("demo.favorite"),
          icon: "star-outline",
          tone: "default",
          onAction: () => actions.toggleFavorite(item),
        },
      ]}
    >
      <ItemRowContent item={item} />
    </SwipeableRow>
  );
}
