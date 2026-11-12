import { FieldError, Input, type InputProps, type InputRef, Label, TextField } from "heroui-native";
import type { JSX, Ref } from "react";
import {
  Controller,
  type Control,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type FormTextFieldProps<TValues extends FieldValues> = Omit<
  InputProps,
  "value" | "defaultValue" | "onChangeText" | "onBlur" | "ref"
> & {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
  rules?: ControllerProps<TValues, FieldPath<TValues>>["rules"];
  inputRef?: Ref<InputRef>;
  isRequired?: boolean;
};

export function FormTextField<TValues extends FieldValues>({
  control,
  name,
  label,
  rules,
  inputRef,
  isRequired = true,
  ...inputProps
}: FormTextFieldProps<TValues>): JSX.Element {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField isRequired={isRequired} isInvalid={Boolean(error)} className="gap-2">
          <Label className="text-sm font-medium text-foreground">{label}</Label>

          <Input
            {...inputProps}
            ref={inputRef}
            value={value ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            variant="secondary"
            className="min-h-12 rounded-xl px-4 text-base"
          />

          <FieldError>{error?.message}</FieldError>
        </TextField>
      )}
    />
  );
}
