"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { EmptyState, Link } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { idleFormState } from "@/lib/form-state";
import { requestPasswordReset } from "../actions";
import { FormError } from "./form-error";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState(requestPasswordReset, idleFormState);
  const [email, setEmail] = useState("");

  if (state.status === "success") {
    return (
      <EmptyState
        announce
        titleAs="h2"
        icon={<Icon name="mark_email_unread" />}
        title={t("forgot.sentTitle")}
        description={t("forgot.sentBody", { email })}
        actions={
          <Button variant="text" href="/sign-in">
            {t("forgot.back")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error} />
      <form action={action} noValidate className="flex flex-col gap-4">
        <TextField
          className="w-full"
          name="email"
          type="email"
          label={t("fields.email")}
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
          invalid={Boolean(state.fieldErrors?.email)}
          errorMessage={state.fieldErrors?.email && te(state.fieldErrors.email)}
        />
        <Button type="submit" variant="filled" pending={pending}>
          {t("forgot.submit")}
        </Button>
      </form>
      <Link href="/sign-in" className="self-center">
        {t("forgot.back")}
      </Link>
    </div>
  );
}
