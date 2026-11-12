import { FormTextField } from "@/components/form-text-field";
import { useConfirm } from "@/components/confirm-provider";
import { LargeTitleScreen } from "@/components/large-title-screen";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { Alert, Button, Spinner, Typography, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";

import { authClient } from "../lib/auth-client";
import { wipeLocalDatabase } from "../lib/db/records";
import { useAuthGate } from "../lib/auth-gate";
import { setFormError } from "../lib/schemas";

const createSchema = (t: TFunction) =>
  z.object({ password: z.string().min(1, t("validation.passwordToConfirm")) });

type FormValues = z.input<ReturnType<typeof createSchema>>;

export default function DeleteAccountScreen(): JSX.Element {
  const { t } = useTranslation();
  const { signOut } = useAuthGate();
  const confirm = useConfirm();
  const dangerForeground = useThemeColor("danger-foreground");

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: { password: "" },
    mode: "onTouched",
  });
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const formError = errors.root?.server?.message;

  async function deleteAccount(values: FormValues): Promise<void> {
    clearErrors("root");
    try {
      // Better Auth's delete-user; the server needs `user.deleteUser.enabled` (auth-api-setup.md).
      const result = await authClient.deleteUser({ password: values.password });
      if (result.error) {
        setFormError(form, result.error.message ?? t("deleteAccount.failed"));
        return;
      }
    } catch {
      setFormError(form, t("errors.network"));
      return;
    }
    // The account is gone: clear this device's database too, then the cached session, so the app
    // returns to sign-in.
    await wipeLocalDatabase().catch((error: unknown) =>
      console.warn("delete account: could not clear the local database", error)
    );
    await signOut();
  }

  function confirmAndSubmit(): void {
    void handleSubmit(async (values) => {
      const confirmed = await confirm({
        title: t("deleteAccount.confirmTitle"),
        message: t("deleteAccount.confirmMessage"),
        confirmLabel: t("common.delete"),
        destructive: true,
      });
      if (confirmed) await deleteAccount(values);
    })();
  }

  return (
    <LargeTitleScreen title={t("deleteAccount.title")} subtitle={t("deleteAccount.subtitle")}>
      <View className="gap-4 px-4">
        <Typography.Paragraph color="muted">{t("deleteAccount.description")}</Typography.Paragraph>

        {formError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("deleteAccount.failedTitle")}</Alert.Title>
              <Alert.Description>{formError}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <FormTextField
          control={control}
          name="password"
          label={t("auth.password")}
          secureTextEntry
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={confirmAndSubmit}
        />

        <Button variant="danger" onPress={confirmAndSubmit} isDisabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner color={dangerForeground} />
          ) : (
            <Button.Label>{t("deleteAccount.submit")}</Button.Label>
          )}
        </Button>
      </View>
    </LargeTitleScreen>
  );
}
