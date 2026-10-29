"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { idleFormState } from "@/lib/form-state";
import { updatePassword } from "../actions";
import { FormError } from "./form-error";

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [state, action, pending] = useActionState(updatePassword, idleFormState);

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error} />
      <form action={action} noValidate className="flex flex-col gap-4">
        <TextField
          className="w-full"
          name="password"
          type="password"
          label={t("fields.newPassword")}
          autoComplete="new-password"
          required
          supportingText={t("fields.passwordHint")}
          invalid={Boolean(state.fieldErrors?.password)}
          errorMessage={state.fieldErrors?.password && te(state.fieldErrors.password)}
        />
        <Button type="submit" variant="filled" pending={pending}>
          {t("update.submit")}
        </Button>
      </form>
    </div>
  );
}
