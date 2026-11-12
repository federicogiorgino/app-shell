import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ComponentRef, JSX, RefObject } from "react";
import type { View } from "react-native";

import { GlassSheet } from "@/components/glass-sheet";
import { SettingsRow, SettingsSection } from "@/components/settings-rows";

export interface ActionSheetAction {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Drawn in danger colour. Ask with `useConfirm()` inside `onPress` before doing the work. */
  destructive?: boolean;
  onPress: () => void;
}

/**
 * The preset bottom sheet for "pick one of these actions", like an iOS action sheet: a glass
 * sheet with one row per action. The sheet closes first, then the action runs. Put destructive
 * actions last and confirm them (`useConfirm`).
 */
export function ActionSheet({
  isOpen,
  onOpenChange,
  title,
  actions,
  blurTarget,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  actions: readonly ActionSheetAction[];
  blurTarget?: RefObject<ComponentRef<typeof View> | null>;
}): JSX.Element {
  return (
    <GlassSheet isOpen={isOpen} onOpenChange={onOpenChange} title={title} blurTarget={blurTarget}>
      <SettingsSection>
        {actions.map((action) => (
          <SettingsRow
            key={action.key}
            icon={action.icon}
            title={action.label}
            tone={action.destructive ? "danger" : "default"}
            chevron={false}
            onPress={() => {
              onOpenChange(false);
              action.onPress();
            }}
          />
        ))}
      </SettingsSection>
    </GlassSheet>
  );
}
