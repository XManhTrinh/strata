"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, signInSchema, signUpSchema, updatePasswordSchema } from "./schemas";

function authErrorKey(error: AuthError): ErrorKey {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    case "weak_password":
      return "passwordNeedsLetterAndDigit";
    case "same_password":
      return "samePassword";
    case "provider_disabled":
    case "validation_failed":
      return "providerUnavailable";
    default:
      return "generic";
  }
}

function callbackUrl(next: string): string {
  const url = new URL("/auth/callback", getPublicEnv().NEXT_PUBLIC_SITE_URL);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", error: authErrorKey(error) };

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(safeNextPath(formData.get("next")?.toString())) },
  });

  if (error || !data.url) redirect(`/sign-in?error=${error ? authErrorKey(error) : "generic"}`);
  redirect(data.url);
}

export async function signUp(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const { fullName, email, password, timeZone } = parsed.data;
  const supabase = await createClient();
  // With email confirmation on, Supabase answers the same way for existing addresses, so the
  // form never reveals whether someone already has an account.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(safeNextPath(formData.get("next")?.toString(), "/onboarding")),
      data: { full_name: fullName, time_zone: timeZone },
    },
  });
  if (error) return { status: "error", error: authErrorKey(error) };

  return { status: "success" };
}

export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/update-password"),
  });
  // Only rate limits are worth telling; anything else would hint whether the account exists.
  if (error?.code === "over_email_send_rate_limit")
    return { status: "error", error: "rateLimited" };

  return { status: "success" };
}

export async function updatePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", error: authErrorKey(error) };

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
