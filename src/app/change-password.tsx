import { FormTextField } from "@/components/form-text-field";
import { LargeTitleScreen } from "@/components/large-title-screen";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { useRouter } from "expo-router";
import { Alert, Button, Spinner, useThemeColor } from "heroui-native";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";

import { authClient } from "../lib/auth-client";
import { newPasswordField, setFormError } from "../lib/schemas";
import { useNotify } from "../lib/use-notify";

const createSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t("validation.currentPasswordRequired")),
      newPassword: newPasswordField(t),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.passwordsMismatch"),
    });

type FormValues = z.input<ReturnType<typeof createSchema>>;

export default function ChangePasswordScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const accentForeground = useThemeColor("accent-foreground");
  const notify = useNotify();

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = form;

  const formError = errors.root?.server?.message;

  async function onValid(values: FormValues): Promise<void> {
    clearErrors("root");
    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setFormError(form, result.error.message ?? t("changePassword.failed"));
        return;
      }
      notify.success(t("changePassword.successTitle"), t("changePassword.successMessage"));
      router.back();
    } catch {
      setFormError(form, t("errors.network"));
    }
  }

  function submit(): void {
    void handleSubmit(onValid)();
  }

  return (
    <LargeTitleScreen title={t("changePassword.title")} subtitle={t("changePassword.subtitle")}>
      <View className="gap-4 px-5 py-2">
        {formError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("changePassword.failedTitle")}</Alert.Title>
              <Alert.Description>{formError}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <FormTextField
          control={control}
          name="currentPassword"
          label={t("changePassword.current")}
          secureTextEntry
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <FormTextField
          control={control}
          name="newPassword"
          label={t("changePassword.new")}
          secureTextEntry
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <FormTextField
          control={control}
          name="confirmPassword"
          label={t("changePassword.confirm")}
          secureTextEntry
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button onPress={submit} isDisabled={isSubmitting || !isValid}>
          {isSubmitting ? (
            <Spinner color={accentForeground} />
          ) : (
            <Button.Label>{t("changePassword.submit")}</Button.Label>
          )}
        </Button>
      </View>
    </LargeTitleScreen>
  );
}
