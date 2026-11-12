# Forms

Forms are built with react-hook-form, a Zod schema through `zodResolver`, and `FormTextField`. All error messages are translated. Shared rules live in `src/lib/schemas.ts` (see [api-and-storage.md](api-and-storage.md#schemas-and-form-helpers-srclibschemasts)).

## `FormTextField`

`src/components/form-text-field.tsx`. A HeroUI `TextField` (label, input, error) bound to react-hook-form with a `Controller`.

```tsx
<FormTextField
  control={control}
  name="email"
  label={t("auth.email")}
  inputRef={emailRef}
  keyboardType="email-address"
  autoComplete="email"
  autoCapitalize="none"
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()}
/>
```

| Prop              | Meaning                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `control`, `name` | react-hook-form (`name` is a typed field path)                                                                                                                                                                             |
| `label`           | Shown above the input                                                                                                                                                                                                      |
| `rules`           | Optional react-hook-form rules (normally the Zod schema does it)                                                                                                                                                           |
| `inputRef`        | An `InputRef` ref, to move focus between fields                                                                                                                                                                            |
| `isRequired`      | Marks the field required (default `true`)                                                                                                                                                                                  |
| everything else   | Passed to HeroUI's `Input`: `placeholder`, `keyboardType`, `secureTextEntry`, `autoComplete`, `returnKeyType`, `onSubmitEditing`, ... (except `value`, `defaultValue`, `onChangeText`, `onBlur`, `ref`, which it controls) |

The input is the `secondary` variant with `min-h-12 rounded-xl px-4`. An error message from the resolver appears under the field and the field shows its invalid state. A `null` value is shown as an empty string.

## The recipe

```tsx
const { t } = useTranslation();
const schema = z.object({ email: emailField(t), password: newPasswordField(t) });   // build inside the component
type Values = z.input<typeof schema>;

const form = useForm<Values>({
  resolver: zodResolver(schema),
  defaultValues: { email: "", password: "" },
  mode: "onTouched",              // validate when a field loses focus, then while typing
});
const { control, handleSubmit, clearErrors, formState: { errors, isSubmitting } } = form;

async function onValid(values: Values) {
  clearErrors("root");
  try {
    const result = await api(...);
  } catch {
    setFormError(form, t("errors.network"));
  }
}

// handleSubmit expects a web event; wrap it for press handlers:
const submit = () => void handleSubmit(onValid)();
```

- Build the schema inside the component with `t`, so messages follow the language (React Compiler memoises it).
- `mode: "onTouched"` for most forms; `"onChange"` with `isValid` to disable submit until valid (change password).
- A failed request that is not tied to one field: `setFormError(form, message)` writes `root.server`; render `errors.root?.server?.message` in a danger `Alert` above the form. Clear it with `clearErrors("root")` at the start of a submit.
- A field-level server error (email already taken): `setError("email", { message })`.
- While submitting, disable the button, show a `Spinner` and set `accessibilityLabel` to the translated "Please wait".
- Wrap a form screen in a `KeyboardAvoidingView` (`behavior="padding"`) and a `ScrollView` with `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="interactive"`, `automaticallyAdjustKeyboardInsets`, as `sign-in.tsx` does.
- Set `autoComplete`, `keyboardType`, `autoCapitalize`, `autoCorrect` and `returnKeyType` so the keyboard, password managers and the Return key behave; the last field's Return should submit (`returnKeyType="go"`, `onSubmitEditing={submit}`).

### A complete form screen

```tsx
const createSchema = (t: TFunction) =>
  z.object({
    title: requiredText(t("validation.titleRequired")),
    email: emailField(t),
  });
type FormValues = z.input<ReturnType<typeof createSchema>>;

export default function EditScreen() {
  const { t } = useTranslation();
  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: { title: "", email: "" },
    mode: "onTouched",
  });
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  async function onValid(values: FormValues) {
    clearErrors("root");
    try {
      await save(createSchema(t).parse(values)); // parse() applies trim() and defaults
    } catch (error) {
      setFormError(form, getErrorMessage(error));
    }
  }

  return (
    <LargeTitleScreen title={t("edit.title")}>
      <View className="gap-4 px-4">
        {errors.root?.server ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{errors.root.server.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        <FormTextField
          control={control}
          name="title"
          label={t("edit.titleLabel")}
          returnKeyType="next"
        />
        <FormTextField
          control={control}
          name="email"
          label={t("edit.emailLabel")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button onPress={() => void handleSubmit(onValid)()} isDisabled={isSubmitting}>
          <Button.Label>{t("common.save")}</Button.Label>
        </Button>
      </View>
    </LargeTitleScreen>
  );
}
```

- Add the `validation.*` keys you use (`titleRequired` here) to every language file.
- Cross-field rules ("passwords match") use `.refine()` with a `path`; `change-password.tsx` shows it.
- `FormTextField`'s `rules` prop is ignored when a Zod resolver is used.
- Errors already shown stay in the old language after a language switch until the field is validated again.
- Working examples: `sign-in.tsx`, `change-password.tsx`, `delete-account.tsx`, and `item-sheet.tsx` for a form in a sheet.

## Forms inside a bottom sheet

Use `BottomSheetTextInput` (Gorhom) wrapped with `withUniwind`, not React Native's `TextInput`, so the sheet rises above the keyboard. Third-party inputs do not take classes, so resolve them with `useResolveClassNames("text-body text-foreground")` and pass the result as `style`. `item-sheet.tsx` is the working example: a title input (focused after the sheet opens through `onShown`), a multiline note, and a colour picker. Keep the form state in the provider or in a component inside the sheet, not in the screen behind it.

## Field building blocks

- `FieldLabel` (`fields.tsx`): a small muted label above a group of chips.
- `ColorChips` (`fields.tsx`): chips with a colour dot ([widgets.md](widgets.md)).
- HeroUI components for other inputs: `Select`, `Checkbox`, `RadioGroup`, `Switch`, `TextArea`, `SearchField`, `Slider`, `InputOTP`. Consult the HeroUI Native docs for their APIs; do not guess props.
