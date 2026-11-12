import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Text, View } from "react-native";
import { useUniwind } from "uniwind";

import { LargeTitleScreen } from "@/components/large-title-screen";
import { PermissionSheet } from "@/components/permission-sheet";
import {
  SettingsLinkRow,
  SettingsSection,
  SettingsSegmentRow,
  SettingsSwitchRow,
} from "@/components/settings-rows";
import { accentSwatch, useAccentPreference } from "@/lib/accent-preference";
import { authClient } from "@/lib/auth-client";
import { useAuthGate } from "@/lib/auth-gate";
import { config } from "@/lib/config";
import { LANGUAGES, useLanguagePreference } from "@/lib/i18n";
import {
  requestNotificationPermission,
  useNotificationPermission,
} from "@/lib/notification-permission";
import {
  setReduceTransparencyPreference,
  useReduceTransparencyPreference,
} from "@/lib/reduce-transparency";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";
import { useNotify } from "@/lib/use-notify";

/** The signed-in user's row; only mounted when sign-in is on, so the session hook never runs otherwise. */
function AccountSection(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  return (
    <SettingsSection title={t("settings.account")}>
      <SettingsLinkRow
        icon="person-outline"
        title={session?.user.name ?? ""}
        description={session?.user.email}
        onPress={() => router.push("/account")}
      />
    </SettingsSection>
  );
}

/** Settings: device preferences, kept with `flags` (see docs/theming-and-settings.md). */
export default function SettingsScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const notify = useNotify();
  const { authEnabled } = useAuthGate();
  const accentId = useAccentPreference();
  const { theme } = useUniwind();
  const language = useLanguagePreference();
  const reduceTransparency = useReduceTransparencyPreference();
  const [themePreference, setThemeChoice] = useState<ThemePreference>(getThemePreference);
  const [permission, setPermission] = useNotificationPermission();
  const [asking, setAsking] = useState(false);

  const allow = (): void => {
    setAsking(false);
    requestNotificationPermission(t("permission.channel"))
      .then((result) => {
        setPermission(result);
        if (result === "granted") notify.success(t("permission.granted"));
        else notify.info(t("permission.declined"));
      })
      .catch(() => notify.error(t("errors.generic")));
  };

  const permissionLabel =
    permission === "granted"
      ? t("permission.statusGranted")
      : permission === "denied"
        ? t("permission.statusDenied")
        : t("permission.statusNotAsked");

  return (
    <>
      <LargeTitleScreen title={t("settings.title")} subtitle={t("settings.subtitle")}>
        <View className="gap-6 px-4 pt-2 pb-6">
          {authEnabled ? <AccountSection /> : null}

          <SettingsSection title={t("settings.appearance")}>
            <SettingsSegmentRow
              options={[
                { value: "system", label: t("settings.themeSystem") },
                { value: "light", label: t("settings.themeLight") },
                { value: "dark", label: t("settings.themeDark") },
              ]}
              value={themePreference}
              onChange={(next) => {
                setThemeChoice(next);
                setThemePreference(next);
              }}
            />
            <SettingsLinkRow
              icon="color-fill-outline"
              title={t("settings.accentColor")}
              value={
                <View
                  className="size-4 rounded-full"
                  style={{ backgroundColor: accentSwatch(accentId, theme) }}
                />
              }
              onPress={() => router.push("/accent")}
            />
            <SettingsLinkRow
              icon="language-outline"
              title={t("settings.language")}
              value={language === "system" ? t("language.system") : LANGUAGES[language].label}
              onPress={() => router.push("/language")}
            />
          </SettingsSection>

          <SettingsSection title={t("settings.notifications")}>
            <SettingsLinkRow
              icon="notifications-outline"
              title={t("permission.rowTitle")}
              value={permissionLabel}
              disabled={permission === "granted"}
              chevron={permission !== "granted"}
              onPress={() => {
                if (permission === "denied") void Linking.openSettings();
                else setAsking(true);
              }}
            />
          </SettingsSection>

          <SettingsSection title={t("settings.accessibility")}>
            <SettingsSwitchRow
              icon="eye-outline"
              title={t("settings.reduceTransparency")}
              value={reduceTransparency}
              onChange={setReduceTransparencyPreference}
            />
          </SettingsSection>

          <Text className="text-center text-caption text-muted">
            {t("settings.version", {
              app: config.appName,
              version: Constants.expoConfig?.version ?? "",
            })}
          </Text>
        </View>
      </LargeTitleScreen>
      <PermissionSheet isOpen={asking} onAllow={allow} onNotNow={() => setAsking(false)} />
    </>
  );
}
