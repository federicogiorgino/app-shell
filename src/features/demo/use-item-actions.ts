import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useContextMenu } from "@/components/context-menu";
import type { RowRect } from "@/components/swipeable-row";
import { useGlassToast } from "@/lib/glass-toast";
import { useNotify } from "@/lib/use-notify";

import { useItemSheet } from "./components/item-sheet";
import { deleteItem, updateItem } from "./repository";
import type { Item } from "./schema";

/**
 * The commands a demo row runs, shared by its swipes, its context menu and its accessibility
 * actions. A failed write shows an error toast; destructive commands offer Undo.
 */
export function useItemActions() {
  const { t } = useTranslation();
  const router = useRouter();
  const notify = useNotify();
  const showToast = useGlassToast();
  const openMenu = useContextMenu();
  const { openEdit } = useItemSheet();

  const attempt = (task: () => Promise<void>): void => {
    task().catch(() => notify.error(t("errors.generic")));
  };

  const open = (item: Item): void =>
    router.push({ pathname: "/item/[id]", params: { id: item.id } });

  const edit = (item: Item): void => openEdit(item);

  const toggleDone = (item: Item): void =>
    attempt(async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateItem(item, { done: !item.done });
      showToast({
        label: item.done ? t("demo.reopened") : t("demo.markedDone"),
        onUndo: () => attempt(async () => void (await updateItem(item, {}))),
      });
    });

  const toggleFavorite = (item: Item): void =>
    attempt(async () => {
      await updateItem(item, { favorite: !item.favorite });
    });

  const remove = (item: Item): void =>
    attempt(async () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const undo = await deleteItem(item);
      showToast({ label: t("demo.deleted"), onUndo: () => attempt(undo) });
    });

  return {
    open,
    edit,
    toggleDone,
    toggleFavorite,
    remove,
    openMenu: (item: Item, rect: RowRect, preview: ReactNode): void =>
      openMenu({
        rect,
        preview,
        label: t("menu.label", { title: item.title }),
        items: [
          {
            key: "edit",
            label: t("common.edit"),
            icon: "create-outline",
            onPress: () => edit(item),
          },
          {
            key: "done",
            label: item.done ? t("demo.reopen") : t("demo.markDone"),
            icon: item.done ? "ellipse-outline" : "checkmark-circle-outline",
            onPress: () => toggleDone(item),
          },
          {
            key: "favorite",
            label: item.favorite ? t("demo.unfavorite") : t("demo.favorite"),
            icon: item.favorite ? "star" : "star-outline",
            onPress: () => toggleFavorite(item),
          },
          {
            key: "delete",
            label: t("common.delete"),
            icon: "trash-outline",
            destructive: true,
            onPress: () => remove(item),
          },
        ],
      }),
  };
}
