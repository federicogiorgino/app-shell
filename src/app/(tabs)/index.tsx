import { useRouter } from "expo-router";
import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { DataError } from "@/components/data-error";
import { EmptyState } from "@/components/empty-state";
import { HeaderIconButton, LargeTitleScreen } from "@/components/large-title-screen";
import { ScreenLoading } from "@/components/screen-loading";
import { closeOpenRow } from "@/components/swipeable-row";
import { ItemRow } from "@/features/demo/components/item-row";
import { useItemSheet } from "@/features/demo/components/item-sheet";
import { addSampleItems, listItems } from "@/features/demo/repository";
import type { Item } from "@/features/demo/schema";
import { useLiveQuery } from "@/lib/db/use-live-query";
import { useNotify } from "@/lib/use-notify";

/**
 * Home (demo): a virtualized list read live from the local database, with swipeable rows, a
 * context menu, an empty state and the loading and error states. Replace it with your app's
 * first screen.
 */
export default function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const notify = useNotify();
  const { openAdd } = useItemSheet();
  // Bumping the attempt re-runs the query after a read error.
  const [attempt, setAttempt] = useState(0);
  const items = useLiveQuery(["item"], `items:${attempt}`, listItems);

  const header = {
    title: t("demo.homeTitle"),
    subtitle: t("demo.homeSubtitle"),
    // Scrolling closes a row left open by a swipe.
    scrollViewProps: { onScrollBeginDrag: () => void closeOpenRow() },
    rightContent: (
      <View className="flex-row gap-2">
        <HeaderIconButton
          icon="settings-outline"
          label={t("settings.title")}
          onPress={() => router.push("/settings")}
        />
        <HeaderIconButton icon="add" label={t("demo.newTitle")} onPress={openAdd} />
      </View>
    ),
  };

  if (items.status !== "success") {
    return (
      <LargeTitleScreen {...header}>
        {items.status === "loading" ? (
          <ScreenLoading />
        ) : (
          <DataError onRetry={() => setAttempt((value) => value + 1)} />
        )}
      </LargeTitleScreen>
    );
  }

  const addSamples = (): void => {
    addSampleItems([t("demo.sample1"), t("demo.sample2"), t("demo.sample3"), t("demo.sample4")])
      .then(() => notify.success(t("demo.samplesAdded")))
      .catch(() => notify.error(t("errors.generic")));
  };

  return (
    <LargeTitleScreen<Item>
      {...header}
      list={{
        data: items.data,
        keyExtractor: (item) => item.id,
        renderItem: (item) => (
          <View className="mx-4 mb-2 overflow-hidden rounded-3xl">
            <ItemRow item={item} />
          </View>
        ),
        empty: (
          <EmptyState
            icon="albums-outline"
            title={t("demo.emptyTitle")}
            description={t("demo.emptyDescription")}
            actionLabel={t("demo.addSamples")}
            onAction={addSamples}
          />
        ),
      }}
    >
      {null}
    </LargeTitleScreen>
  );
}
