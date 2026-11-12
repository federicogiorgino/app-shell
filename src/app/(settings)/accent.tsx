import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useUniwind } from "uniwind";

import { LargeTitleScreen } from "@/components/large-title-screen";
import { SettingsOptionRow, SettingsSection } from "@/components/settings-rows";
import {
  ACCENT_IDS,
  accentSwatch,
  setAccentPreference,
  useAccentPreference,
} from "@/lib/accent-preference";

export default function SettingsAccentScreen(): JSX.Element {
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const selectedId = useAccentPreference();

  return (
    <LargeTitleScreen title={t("accent.title")} subtitle={t("accent.subtitle")}>
      <View className="gap-5 px-4 py-2">
        <SettingsSection>
          {ACCENT_IDS.map((id) => (
            <SettingsOptionRow
              key={id}
              // The swatch shows the preset itself, so it uses the preset's own colour.
              leading={
                <View
                  className="size-5 rounded-full"
                  style={{ backgroundColor: accentSwatch(id, theme) }}
                />
              }
              title={t(`accent.${id}`)}
              selected={id === selectedId}
              onPress={() => setAccentPreference(id)}
            />
          ))}
        </SettingsSection>
      </View>
    </LargeTitleScreen>
  );
}
