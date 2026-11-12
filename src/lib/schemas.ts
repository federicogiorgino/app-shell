import type { TFunction } from "i18next";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { z } from "zod";

/**
 * Shared field rules for forms. Rules take the `t` function so error messages follow the app
 * language. Build the schema inside the component (the compiler memoizes it) and pair it with
 * react-hook-form through the Zod resolver:
 *
 *   const { t } = useTranslation();
 *   const schema = z.object({ email: emailField(t) });
 *   const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onTouched" });
 */
export const MIN_PASSWORD_LENGTH = 10;

export const emailField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, t("validation.emailRequired"))
    .pipe(z.email(t("validation.emailInvalid")));

export const requiredText = (message: string) => z.string().trim().min(1, message);

export const newPasswordField = (t: TFunction) =>
  z.string().min(MIN_PASSWORD_LENGTH, t("validation.passwordMin", { count: MIN_PASSWORD_LENGTH }));

/** Shows an error that is not tied to one field (a failed request) above the form. */
export function setFormError<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, "setError">,
  message: string
): void {
  form.setError("root.server", { message });
}
