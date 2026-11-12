import { router } from "expo-router";
import { Alert } from "heroui-native";
import type { JSX } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { LargeTitleScreen } from "@/components/large-title-screen";
import { SettingsRow, SettingsSection } from "@/components/settings-rows";
import { authClient } from "@/lib/auth-client";
import { useAuthGate } from "@/lib/auth-gate";

export default function SettingsAccountScreen(): JSX.Element {
  const { t } = useTranslation();
  const { signOut } = useAuthGate();
  const { data: session } = authClient.useSession();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    if (isSigningOut) return;
    setError(null);
    setIsSigningOut(true);
    const result = await signOut();
    // On success the root layout swaps to the sign-in screen, so only failures need handling.
    if (result.error) {
      setError(result.error);
      setIsSigningOut(false);
    }
  }

  return (
    <LargeTitleScreen title={t("account.title")} subtitle={t("account.subtitle")}>
      <View className="gap-5 px-4 py-2">
        <SettingsSection>
          <SettingsRow
            icon="person-outline"
            title={session?.user.name ?? ""}
            description={session?.user.email}
          />
          <SettingsRow
            icon="key-outline"
            title={t("account.changePassword")}
            onPress={() => router.push("/change-password")}
          />
        </SettingsSection>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title className="text-danger">{t("account.signOutFailed")}</Alert.Title>
              <Alert.Description className="text-danger">{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <SettingsSection>
          <SettingsRow
            icon="log-out-outline"
            tone="danger"
            title={t("account.signOut")}
            chevron={false}
            loading={isSigningOut}
            accessibilityLabel={isSigningOut ? t("account.signingOut") : undefined}
            onPress={() => void handleSignOut()}
          />
          <SettingsRow
            icon="trash-outline"
            tone="danger"
            title={t("account.deleteAccount")}
            chevron={false}
            onPress={() => router.push("/delete-account")}
          />
        </SettingsSection>
      </View>
    </LargeTitleScreen>
  );
}
