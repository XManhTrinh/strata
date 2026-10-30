"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Divider, TextField } from "@windmorph/react";
import { Link } from "@windmorph/react-pro";
import { type ErrorKey, idleFormState } from "@/lib/form-state";
import { signIn } from "../actions";
import { FormError } from "./form-error";
import { GoogleButton } from "./google-button";

export function SignInForm({ next, initialError }: { next: string; initialError?: ErrorKey }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const [state, onSubmit, pending] = useFormAction(signIn, idleFormState);
  // Controlled, so the email survives the form reset after a failed attempt.
  const [email, setEmail] = useState("");
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error ?? initialError} />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField
          className="w-full"
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
          className="w-full"
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

      <div className="flex items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-label-large text-on-surface-variant">{tc("or")}</span>
        <Divider className="flex-1" />
      </div>

      <GoogleButton next={next} mode="signIn" />

      <p className="text-body-medium text-on-surface-variant flex flex-wrap justify-center gap-x-1">
        <span>{t("signIn.noAccount")}</span>
        <Link href={next === "/" ? "/sign-up" : `/sign-up?next=${encodeURIComponent(next)}`}>
          {t("signIn.createAccount")}
        </Link>
      </p>
    </div>
  );
}
