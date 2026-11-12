import { Button, Surface } from "heroui-native";
import { type JSX, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Text, View } from "react-native";

import { Calendar } from "@/components/calendar";
import { ActionSheet } from "@/components/action-sheet";
import { useConfirm, useConfirmDelete } from "@/components/confirm-provider";
import { useContextMenu } from "@/components/context-menu";
import { DataError } from "@/components/data-error";
import { EmptyState } from "@/components/empty-state";
import { ColorChips, FieldLabel } from "@/components/fields";
import { GlassSheet } from "@/components/glass-sheet";
import { LargeTitleScreen } from "@/components/large-title-screen";
import { PermissionSheet } from "@/components/permission-sheet";
import { ProgressRing } from "@/components/progress-ring";
import { useSheet } from "@/components/sheet-host";
import { SwipeableRow } from "@/components/swipeable-row";
import {
  SettingsLinkRow,
  SettingsSection,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/settings-rows";
import { ITEM_COLORS } from "@/features/demo/schema";
import { today } from "@/lib/dates";
import { useGlassToast } from "@/lib/glass-toast";
import {
  requestNotificationPermission,
  useNotificationPermission,
} from "@/lib/notification-permission";
import { useNotify } from "@/lib/use-notify";

/** A titled block of the showcase. */
function Showcase({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <View className="gap-2">
      <Text
        accessibilityRole="header"
        className="px-2 text-caption font-semibold tracking-wider text-muted uppercase"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Components (demo): the shell's building blocks in one place, to see them in light and dark and
 * to copy from. Delete this tab when you start your own app, or keep it as a living style guide.
 */
export default function ComponentsScreen(): JSX.Element {
  const { t } = useTranslation();
  const notify = useNotify();
  const showToast = useGlassToast();
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const openMenu = useContextMenu();
  const { present, dismiss } = useSheet();
  const askDelete = (): void =>
    void confirmDelete(t("showcase.gestureDeleteTitle"), t("showcase.gestureDeleteMessage"));
  const picked = (action: string): void => notify.info(t("showcase.picked", { action }));
  const [permission, setPermission] = useNotificationPermission();
  const [date, setDate] = useState(today);
  const [progress, setProgress] = useState(0.6);
  const [size, setSize] = useState<"s" | "m" | "l">("m");
  const [switchOn, setSwitchOn] = useState(true);
  const [colors, setColors] = useState<readonly string[]>([ITEM_COLORS[0]]);

  const allow = (): void => {
    dismiss();
    requestNotificationPermission(t("permission.channel"))
      .then((result) => {
        setPermission(result);
        if (result === "granted") notify.success(t("permission.granted"));
        else notify.info(t("permission.declined"));
      })
      .catch(() => notify.error(t("errors.generic")));
  };

  const showActions = (): void =>
    present((sheet) => (
      <ActionSheet
        {...sheet}
        title={t("showcase.actionSheetTitle")}
        actions={[
          {
            key: "share",
            label: t("showcase.actionShare"),
            icon: "share-outline",
            onPress: () => picked(t("showcase.actionShare")),
          },
          {
            key: "duplicate",
            label: t("showcase.actionDuplicate"),
            icon: "copy-outline",
            onPress: () => picked(t("showcase.actionDuplicate")),
          },
          {
            key: "delete",
            label: t("common.delete"),
            icon: "trash-outline",
            destructive: true,
            onPress: askDelete,
          },
        ]}
      />
    ));
  const showForm = (): void =>
    present((sheet) => (
      <GlassSheet
        {...sheet}
        title={t("showcase.formSheetTitle")}
        onConfirm={() => {
          dismiss();
          notify.success(t("showcase.formSheetSaved"));
        }}
      >
        <View className="h-24" />
      </GlassSheet>
    ));
  const askPermission = (): void =>
    present((sheet) => <PermissionSheet {...sheet} onAllow={allow} onNotNow={dismiss} />);

  const permissionLabel =
    permission === "granted"
      ? t("permission.statusGranted")
      : permission === "denied"
        ? t("permission.statusDenied")
        : t("permission.statusNotAsked");

  return (
    <LargeTitleScreen title={t("showcase.title")} subtitle={t("showcase.subtitle")}>
      <View className="gap-6 px-4 pt-2 pb-8">
        <Showcase title={t("showcase.feedback")}>
          <Surface className="gap-2">
            <Button variant="secondary" onPress={() => notify.success(t("showcase.toastSuccess"))}>
              <Button.Label>{t("showcase.showSuccess")}</Button.Label>
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                notify.error(t("showcase.toastError"), t("showcase.toastErrorDescription"))
              }
            >
              <Button.Label>{t("showcase.showError")}</Button.Label>
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                showToast({
                  label: t("showcase.toastUndo"),
                  onUndo: () => notify.info(t("showcase.undone")),
                })
              }
            >
              <Button.Label>{t("showcase.showUndo")}</Button.Label>
            </Button>
            <Button
              variant="danger-soft"
              onPress={() =>
                void confirm({
                  title: t("showcase.confirmTitle"),
                  message: t("showcase.confirmMessage"),
                  confirmLabel: t("common.delete"),
                  destructive: true,
                }).then((ok) => notify.info(ok ? t("showcase.confirmed") : t("showcase.cancelled")))
              }
            >
              <Button.Label>{t("showcase.showConfirm")}</Button.Label>
            </Button>
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.sheets")}>
          <Surface className="gap-2">
            <Button variant="secondary" onPress={showActions}>
              <Button.Label>{t("showcase.showActionSheet")}</Button.Label>
            </Button>
            <Button variant="secondary" onPress={showForm}>
              <Button.Label>{t("showcase.showFormSheet")}</Button.Label>
            </Button>
            <Button variant="secondary" onPress={askPermission}>
              <Button.Label>{t("showcase.showPermissionSheet")}</Button.Label>
            </Button>
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.gestures")}>
          <Surface className="overflow-hidden p-0">
            <SwipeableRow
              accessibilityLabel={t("showcase.gestureTitle")}
              onPress={() => notify.info(t("showcase.gestureTapped"))}
              onLongPress={(rect) =>
                openMenu({
                  rect,
                  label: t("showcase.gestureTitle"),
                  preview: (
                    <View className="min-h-16 justify-center gap-0.5 px-4 py-2.5">
                      <Text className="text-body font-semibold text-foreground">
                        {t("showcase.gestureTitle")}
                      </Text>
                      <Text className="text-caption text-muted">{t("showcase.gestureHint")}</Text>
                    </View>
                  ),
                  items: [
                    {
                      key: "share",
                      label: t("showcase.actionShare"),
                      icon: "share-outline",
                      onPress: () => picked(t("showcase.actionShare")),
                    },
                    {
                      key: "delete",
                      label: t("common.delete"),
                      icon: "trash-outline",
                      destructive: true,
                      onPress: askDelete,
                    },
                  ],
                })
              }
              leadingAction={{
                key: "done",
                label: t("showcase.gestureDone"),
                icon: "checkmark",
                tone: "success",
                onAction: () => notify.success(t("showcase.gestureDone")),
              }}
              trailingActions={[
                {
                  key: "edit",
                  label: t("showcase.gestureEdit"),
                  icon: "create-outline",
                  tone: "accent",
                  onAction: () => picked(t("showcase.gestureEdit")),
                },
                {
                  key: "delete",
                  label: t("common.delete"),
                  icon: "trash-outline",
                  tone: "danger",
                  onAction: askDelete,
                },
              ]}
            >
              <View className="min-h-16 justify-center gap-0.5 px-4 py-2.5">
                <Text className="text-body font-semibold text-foreground">
                  {t("showcase.gestureTitle")}
                </Text>
                <Text className="text-caption text-muted">{t("showcase.gestureHint")}</Text>
              </View>
            </SwipeableRow>
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.buttons")}>
          <Surface className="gap-2">
            <Button>
              <Button.Label>{t("showcase.primary")}</Button.Label>
            </Button>
            <Button variant="secondary">
              <Button.Label>{t("showcase.secondary")}</Button.Label>
            </Button>
            <Button variant="tertiary">
              <Button.Label>{t("showcase.tertiary")}</Button.Label>
            </Button>
            <Button variant="ghost">
              <Button.Label>{t("showcase.ghost")}</Button.Label>
            </Button>
            <Button variant="danger">
              <Button.Label>{t("common.delete")}</Button.Label>
            </Button>
          </Surface>
        </Showcase>

        <SettingsSection title={t("showcase.rows")}>
          <SettingsLinkRow
            icon="notifications-outline"
            title={t("permission.rowTitle")}
            value={permissionLabel}
            onPress={() => {
              if (permission === "denied") void Linking.openSettings();
              else if (permission !== "granted") askPermission();
            }}
          />
          <SettingsSwitchRow
            icon="toggle-outline"
            title={t("showcase.switchRow")}
            value={switchOn}
            onChange={setSwitchOn}
          />
          <SettingsSegmentRow
            icon="resize-outline"
            title={t("showcase.segmentRow")}
            options={[
              { value: "s", label: t("showcase.sizeSmall") },
              { value: "m", label: t("showcase.sizeMedium") },
              { value: "l", label: t("showcase.sizeLarge") },
            ]}
            value={size}
            onChange={setSize}
          />
        </SettingsSection>

        <Showcase title={t("showcase.progress")}>
          <Surface className="flex-row items-center gap-4">
            <ProgressRing fraction={progress} accessibilityLabel={t("showcase.progressLabel")} />
            <View className="flex-1 flex-row gap-2">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setProgress((value) => Math.max(0, value - 0.2))}
              >
                <Button.Label>{t("showcase.less")}</Button.Label>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setProgress((value) => Math.min(1, value + 0.2))}
              >
                <Button.Label>{t("showcase.more")}</Button.Label>
              </Button>
            </View>
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.chips")}>
          <Surface>
            <FieldLabel>{t("demo.color")}</FieldLabel>
            <ColorChips
              options={ITEM_COLORS.map((color, index) => ({
                id: color,
                name: t("demo.colorName", { number: index + 1 }),
                color,
              }))}
              selected={colors}
              onToggle={(color) =>
                setColors((current) =>
                  current.includes(color)
                    ? current.filter((value) => value !== color)
                    : [...current, color]
                )
              }
            />
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.calendar")}>
          <Surface>
            <Calendar value={date} onChange={setDate} weekStart={1} />
          </Surface>
        </Showcase>

        <Showcase title={t("showcase.states")}>
          <Surface>
            <EmptyState
              icon="file-tray-outline"
              title={t("showcase.emptyTitle")}
              description={t("showcase.emptyDescription")}
            />
          </Surface>
          <Surface>
            <DataError onRetry={() => notify.info(t("showcase.retried"))} />
          </Surface>
        </Showcase>
      </View>
    </LargeTitleScreen>
  );
}
