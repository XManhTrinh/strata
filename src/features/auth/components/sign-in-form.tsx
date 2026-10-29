"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, LabeledDivider, TextField } from "@windmorph/react";
import { Link } from "@windmorph/react-pro";
import { type ErrorKey, idleFormState } from "@/lib/form-state";
import { signIn, signInWithGoogle } from "../actions";
import { FormError } from "./form-error";

export function SignInForm({ next, initialError }: { next: string; initialError?: ErrorKey }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(signIn, idleFormState);
  // Controlled, so the email survives the form reset after a failed attempt.
  const [email, setEmail] = useState("");
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error ?? initialError} />

      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField
          name="email"
          type="email"
          label={t("fields.email")}
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
          invalid={Boolean(fieldErrors.email)}
          errorMessage={fieldErrors.email && te(fieldErrors.email)}
        />
        <TextField
          name="password"
          type="password"
          label={t("fields.password")}
          autoComplete="current-password"
          required
          invalid={Boolean(fieldErrors.password)}
          errorMessage={fieldErrors.password && te(fieldErrors.password)}
        />
        <Link href="/forgot-password" className="self-end">
          {t("signIn.forgot")}
        </Link>
        <Button type="submit" variant="filled" pending={pending}>
          {t("signIn.submit")}
        </Button>
      </form>

      <LabeledDivider>{tc("or")}</LabeledDivider>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outlined" className="w-full">
          {t("signIn.google")}
        </Button>
      </form>

      <p className="text-body-medium text-on-surface-variant flex flex-wrap justify-center gap-x-1">
        <span>{t("signIn.noAccount")}</span>
        <Link href="/sign-up">{t("signIn.createAccount")}</Link>
      </p>
    </div>
  );
}
