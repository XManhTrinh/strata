"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { EmptyState, Link } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { idleFormState } from "@/lib/form-state";
import { signUp } from "../actions";
import { FormError } from "./form-error";

export function SignUpForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState(signUp, idleFormState);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const fieldErrors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <EmptyState
        announce
        titleAs="h2"
        icon={<Icon name="mark_email_unread" />}
        title={t("signUp.checkEmailTitle")}
        description={t("signUp.checkEmailBody", { email })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error} />

      <form action={action} noValidate className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <input
          type="hidden"
          name="timeZone"
          value={Intl.DateTimeFormat().resolvedOptions().timeZone}
        />
        <TextField
          name="fullName"
          label={t("fields.fullName")}
          autoComplete="name"
          required
          value={fullName}
          onChange={setFullName}
          invalid={Boolean(fieldErrors.fullName)}
          errorMessage={fieldErrors.fullName && te(fieldErrors.fullName)}
        />
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
          autoComplete="new-password"
          required
          supportingText={t("fields.passwordHint")}
          invalid={Boolean(fieldErrors.password)}
          errorMessage={fieldErrors.password && te(fieldErrors.password)}
        />
        <Button type="submit" variant="filled" pending={pending}>
          {t("signUp.submit")}
        </Button>
      </form>

      <p className="text-body-medium text-on-surface-variant flex flex-wrap justify-center gap-x-1">
        <span>{t("signUp.haveAccount")}</span>
        <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}>
          {t("signUp.signIn")}
        </Link>
      </p>
    </div>
  );
}
