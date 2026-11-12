import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { LargeTitleScreen } from "@/components/large-title-screen";
import { SettingsOptionRow, SettingsSection } from "@/components/settings-rows";
import {
  LANGUAGES,
  LANGUAGE_CODES,
  setLanguagePreference,
  useLanguagePreference,
  type LanguagePreference,
} from "@/lib/i18n";

const OPTIONS: readonly LanguagePreference[] = ["system", ...LANGUAGE_CODES];

export default function SettingsLanguageScreen(): JSX.Element {
  const { t } = useTranslation();
  const selected = useLanguagePreference();

  return (
    <LargeTitleScreen title={t("language.title")} subtitle={t("language.subtitle")}>
      <View className="gap-5 px-4 py-2">
        <SettingsSection>
          {OPTIONS.map((option) => (
            <SettingsOptionRow
              key={option}
              title={option === "system" ? t("language.system") : LANGUAGES[option].label}
              selected={option === selected}
              onPress={() => setLanguagePreference(option)}
            />
          ))}
        </SettingsSection>
      </View>
    </LargeTitleScreen>
  );
}
