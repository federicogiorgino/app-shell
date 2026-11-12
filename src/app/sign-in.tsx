import { FormTextField } from "@/components/form-text-field";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, type InputRef, Spinner, Typography, useThemeColor } from "heroui-native";
import { useRef, useState } from "react";
import type { JSX } from "react";
import type { TFunction } from "i18next";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { authClient } from "../lib/auth-client";
import { config } from "../lib/config";
import {
  MIN_PASSWORD_LENGTH,
  emailField,
  newPasswordField,
  requiredText,
  setFormError,
} from "../lib/schemas";

type Mode = "sign-in" | "sign-up";

// Both modes share one shape so a single form type works; sign-in ignores `name`, and only
// sign-up enforces the password length (existing accounts may predate the rule).
const createSignInSchema = (t: TFunction) =>
  z.object({
    name: z.string(),
    email: emailField(t),
    password: z.string().min(1, t("validation.passwordRequired")),
  });

const createSignUpSchema = (t: TFunction) =>
  z.object({
    name: requiredText(t("validation.nameRequired")),
    email: emailField(t),
    password: newPasswordField(t),
  });

type FormValues = z.input<ReturnType<typeof createSignInSchema>>;

export default function SignInScreen(): JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const accentForeground = useThemeColor("accent-foreground");
  const [mode, setMode] = useState<Mode>("sign-in");
  const isSignUp = mode === "sign-up";

  const form = useForm<FormValues>({
    resolver: zodResolver(isSignUp ? createSignUpSchema(t) : createSignInSchema(t)),
    defaultValues: { name: "", email: "", password: "" },
    // Validate a field when it loses focus, then keep it up to date while typing.
    mode: "onTouched",
  });
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);

  const formError = errors.root?.server?.message;

  function toggleMode(): void {
    setMode(isSignUp ? "sign-in" : "sign-up");
    clearErrors();
  }

  async function onValid(values: FormValues): Promise<void> {
    clearErrors("root");
    const credentials = { email: values.email.trim(), password: values.password };
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ ...credentials, name: values.name.trim() })
        : await authClient.signIn.email(credentials);

      if (result.error) {
        if (result.error.code?.startsWith("USER_ALREADY_EXISTS")) {
          setError("email", { message: t("auth.emailTaken") });
          return;
        }
        setFormError(form, result.error.message ?? t("errors.generic"));
      }
      // On success the session updates and the root layout swaps to the app.
    } catch (caught) {
      // The generic message hides the cause, so show it in development builds.
      const detail =
        __DEV__ && caught instanceof Error ? ` (${caught.name}: ${caught.message})` : "";
      if (__DEV__) console.warn("Auth request failed", caught);
      setFormError(form, `${t("errors.network")}${detail}`);
    }
  }

  // handleSubmit expects a web event; press handlers pass a native one, so wrap it.
  function submit(): void {
    void handleSubmit(onValid)();
  }

  return (
    // "padding" on both platforms keeps the focused field above the keyboard, including
    // Android edge-to-edge where the window itself is not resized. Same approach HeroUI uses.
    <KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
      <ScrollView
        contentContainerClassName="grow justify-center gap-8 px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View className="gap-2">
          <Typography.Heading type="h1">{config.appName}</Typography.Heading>
          <Typography.Paragraph color="muted">
            {isSignUp ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
          </Typography.Paragraph>
        </View>

        <View className="gap-4">
          {formError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>
                  {isSignUp ? t("auth.signUpFailed") : t("auth.signInFailed")}
                </Alert.Title>
                <Alert.Description>{formError}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {isSignUp ? (
            <FormTextField
              control={control}
              name="name"
              label={t("auth.name")}
              placeholder={t("auth.namePlaceholder")}
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          ) : null}

          <FormTextField
            control={control}
            name="email"
            label={t("auth.email")}
            inputRef={emailRef}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <FormTextField
            control={control}
            name="password"
            label={t("auth.password")}
            inputRef={passwordRef}
            placeholder={
              isSignUp
                ? t("auth.newPasswordPlaceholder", { count: MIN_PASSWORD_LENGTH })
                : t("auth.passwordPlaceholder")
            }
            secureTextEntry
            autoComplete={isSignUp ? "new-password" : "current-password"}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        </View>

        <View className="gap-2">
          <Button
            onPress={submit}
            isDisabled={isSubmitting}
            accessibilityLabel={isSubmitting ? t("common.pleaseWait") : undefined}
          >
            {isSubmitting ? (
              <Spinner color={accentForeground} />
            ) : (
              <Button.Label>{isSignUp ? t("auth.createAccount") : t("auth.signIn")}</Button.Label>
            )}
          </Button>
          <Button variant="ghost" onPress={toggleMode} isDisabled={isSubmitting}>
            <Button.Label>{isSignUp ? t("auth.haveAccount") : t("auth.newHere")}</Button.Label>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
