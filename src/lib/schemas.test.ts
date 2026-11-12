import { describe, expect, test } from "vitest";
import type { TFunction } from "i18next";

import { emailField, MIN_PASSWORD_LENGTH, newPasswordField } from "./schemas";

// The rules only pass `t` through to their error messages, so returning the key is enough.
const t = ((key: string) => key) as unknown as TFunction;

describe("schemas", () => {
  test("new passwords need MIN_PASSWORD_LENGTH characters", () => {
    const field = newPasswordField(t);
    expect(field.safeParse("a".repeat(MIN_PASSWORD_LENGTH - 1)).success).toBe(false);
    expect(field.safeParse("a".repeat(MIN_PASSWORD_LENGTH)).success).toBe(true);
  });

  test("emails are trimmed and validated", () => {
    const field = emailField(t);
    expect(field.parse("  me@example.com ")).toBe("me@example.com");
    expect(field.safeParse("not-an-email").success).toBe(false);
  });
});
