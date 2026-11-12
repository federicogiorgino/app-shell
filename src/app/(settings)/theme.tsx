import type { JSX } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { LargeTitleScreen } from "@/components/large-title-screen";
import { SettingsOptionRow, SettingsSection } from "@/components/settings-rows";
import {
  getThemePreference,
  setThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme-preference";

const THEME_ICONS = {
  system: "phone-portrait-outline",
  light: "sunny-outline",
  dark: "moon-outline",
} as const satisfies Record<ThemePreference, string>;

export default function SettingsThemeScreen(): JSX.Element {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);

  function chooseTheme(preference: ThemePreference): void {
    setTheme(preference);
    setThemePreference(preference);
  }

  return (
    <LargeTitleScreen title={t("theme.title")} subtitle={t("theme.subtitle")}>
      <View className="gap-5 px-4 py-2">
        <SettingsSection>
          {THEME_PREFERENCES.map((preference) => (
            <SettingsOptionRow
              key={preference}
              icon={THEME_ICONS[preference]}
              title={t(`theme.${preference}`)}
              selected={preference === theme}
              onPress={() => chooseTheme(preference)}
            />
          ))}
        </SettingsSection>
      </View>
    </LargeTitleScreen>
  );
}
