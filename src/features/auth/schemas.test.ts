import { describe, expect, it } from "vitest";
import { fieldErrorsFrom } from "@/lib/form-state";
import { signUpSchema } from "./schemas";

const valid = { fullName: "Ana Pop", email: " ana@example.com ", password: "secret123" };

describe("signUpSchema", () => {
  it("accepts a valid sign-up and trims the email", () => {
    expect(signUpSchema.parse(valid).email).toBe("ana@example.com");
  });

  it("returns translation keys for each invalid field", () => {
    const result = signUpSchema.safeParse({ fullName: " ", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error)).toEqual({
        fullName: "nameRequired",
        email: "emailInvalid",
        password: "passwordTooShort",
      });
    }
  });

  it("requires a letter and a digit, like the Supabase password policy", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "onlyletters" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error).password).toBe("passwordNeedsLetterAndDigit");
    }
  });
});
