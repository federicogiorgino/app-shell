import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Menu, Surface, useThemeColor } from "heroui-native";
import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useConfirm } from "@/components/confirm-provider";
import { DataError } from "@/components/data-error";
import { EmptyState } from "@/components/empty-state";
import { ON_DATA_COLOR, Tile } from "@/components/fields";
import { HeaderIconButton, LargeTitleScreen } from "@/components/large-title-screen";
import { ScreenLoading } from "@/components/screen-loading";
import { SettingsRow, SettingsSection, SettingsSwitchRow } from "@/components/settings-rows";
import { deleteItem, getItem, updateItem } from "@/features/demo/repository";
import type { Item } from "@/features/demo/schema";
import { useLiveQuery } from "@/lib/db/use-live-query";
import { useGlassToast } from "@/lib/glass-toast";
import { MENU_WIDTH } from "@/lib/metrics";
import { useNotify } from "@/lib/use-notify";

/** The full-bleed area above the large title; the header buttons float over it. */
function ItemHero({ item }: { item: Item }): JSX.Element {
  return (
    <View
      className="h-64 items-center justify-center"
      style={{ backgroundColor: item.color }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name={item.done ? "checkmark-circle" : "albums"} size={72} color={ON_DATA_COLOR} />
    </View>
  );
}

/** The ⋯ menu: HeroUI's portalled `Menu`, anchored to the header button. */
function ItemMenu({ item, onDelete }: { item: Item; onDelete: () => void }): JSX.Element {
  const { t } = useTranslation();
  const [foreground, danger] = useThemeColor(["foreground", "danger"]);
  const notify = useNotify();
  const toggleFavorite = (): void => {
    updateItem(item, { favorite: !item.favorite }).catch(() => notify.error(t("errors.generic")));
  };
  return (
    <Menu>
      <Menu.Trigger asChild>
        <HeaderIconButton
          icon="ellipsis-horizontal"
          label={t("menu.label", { title: item.title })}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content presentation="popover" placement="bottom" align="end" width={MENU_WIDTH}>
          <Menu.Item onPress={toggleFavorite}>
            <Ionicons name={item.favorite ? "star" : "star-outline"} size={20} color={foreground} />
            <Menu.ItemTitle>
              {item.favorite ? t("demo.unfavorite") : t("demo.favorite")}
            </Menu.ItemTitle>
          </Menu.Item>
          <Menu.Item variant="danger" onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color={danger} />
            <Menu.ItemTitle>{t("common.delete")}</Menu.ItemTitle>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}

/**
 * Detail (demo): a pushed screen with a hero above the large title, live data, switches that
 * write straight to the local database, a ⋯ menu and a confirmed delete with Undo.
 */
export default function ItemDetailScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useNotify();
  const showToast = useGlassToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [attempt, setAttempt] = useState(0);
  const query = useLiveQuery(["item"], `item:${id}:${attempt}`, () => getItem(id));

  if (query.status === "loading") {
    return (
      <LargeTitleScreen title="">
        <ScreenLoading />
      </LargeTitleScreen>
    );
  }
  if (query.status === "error") {
    return (
      <LargeTitleScreen title={t("demo.detailTitle")}>
        <DataError onRetry={() => setAttempt((value) => value + 1)} />
      </LargeTitleScreen>
    );
  }
  const item = query.data;
  if (!item) {
    return (
      <LargeTitleScreen title={t("demo.detailTitle")}>
        <EmptyState
          icon="search-outline"
          title={t("demo.notFoundTitle")}
          description={t("demo.notFoundDescription")}
          actionLabel={t("common.goBack")}
          onAction={() => router.back()}
        />
      </LargeTitleScreen>
    );
  }

  const update = (changes: Partial<Item>): void => {
    updateItem(item, changes).catch(() => notify.error(t("errors.generic")));
  };

  const remove = async (): Promise<void> => {
    const proceed = await confirm({
      title: t("demo.deleteTitle"),
      message: t("demo.deleteMessage", { title: item.title }),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (!proceed) return;
    try {
      const undo = await deleteItem(item);
      router.back();
      showToast({
        label: t("demo.deleted"),
        aboveTabBar: true,
        onUndo: () => void undo().catch(() => notify.error(t("errors.generic"))),
      });
    } catch {
      notify.error(t("errors.generic"));
    }
  };

  const created = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item.createdAt));

  return (
    <LargeTitleScreen
      title={item.title}
      eyebrow={item.favorite ? t("demo.favorite") : undefined}
      wrapTitle
      hero={<ItemHero item={item} />}
      rightContent={<ItemMenu item={item} onDelete={() => void remove()} />}
    >
      <View className="gap-6 px-4 pt-2 pb-8">
        {item.note ? (
          <Surface>
            <Text className="text-body text-foreground">{item.note}</Text>
          </Surface>
        ) : null}

        <SettingsSection title={t("demo.status")}>
          <SettingsSwitchRow
            icon="checkmark-circle-outline"
            title={t("demo.done")}
            value={item.done}
            onChange={(done) => update({ done })}
          />
          <SettingsSwitchRow
            icon="star-outline"
            title={t("demo.favorite")}
            value={item.favorite}
            onChange={(favorite) => update({ favorite })}
          />
        </SettingsSection>

        <SettingsSection title={t("demo.details")}>
          <SettingsRow
            leading={<Tile icon="color-palette-outline" color={item.color} />}
            title={t("demo.color")}
          />
          <SettingsRow icon="calendar-outline" title={t("demo.created")} description={created} />
        </SettingsSection>
      </View>
    </LargeTitleScreen>
  );
}
