import { z } from "zod";

const email = z
  .string()
  .trim()
  .pipe(z.email({ error: "emailInvalid" }));

// Matches supabase/config.toml: at least 8 characters, letters and digits.
const newPassword = z
  .string()
  .min(8, { error: "passwordTooShort" })
  .regex(/[a-zA-Z]/, { error: "passwordNeedsLetterAndDigit" })
  .regex(/\d/, { error: "passwordNeedsLetterAndDigit" });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "required" }),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, { error: "nameRequired" }).max(200),
  email,
  password: newPassword,
  timeZone: z.string().max(100).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z.object({ password: newPassword });
