"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, TextField } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";
import { updateProfile } from "../actions";

export function ProfileForm({ initial }: { initial: { fullName: string; timeZone: string } }) {
  const t = useTranslations("account.profile");
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(updateProfile, idleFormState);
  const [fullName, setFullName] = useState(initial.fullName);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  useEffect(() => {
    if (state.status === "success") void snackbar.showSnackbar(t("saved"));
  }, [state, snackbar, t]);

  return (
    <section aria-labelledby="profile-title" className="flex max-w-xl flex-col gap-6">
      <h2 id="profile-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <FormError error={state.error} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          className="w-full"
          name="fullName"
          label={t("fullName")}
          autoComplete="name"
          required
          value={fullName}
          onChange={setFullName}
          invalid={Boolean(state.fieldErrors?.fullName)}
          errorMessage={state.fieldErrors?.fullName && te(state.fieldErrors.fullName)}
        />
        <Select
          className="w-full"
          name="timeZone"
          label={t("timeZone")}
          searchable
          value={timeZone}
          onChange={(key) => key != null && setTimeZone(String(key))}
          invalid={Boolean(state.fieldErrors?.timeZone)}
        >
          {timeZones.map((zone) => (
            <SelectItem key={zone}>{zone.replaceAll("_", " ")}</SelectItem>
          ))}
        </Select>
        <Button type="submit" variant="filled" pending={pending} className="self-end">
          {t("save")}
        </Button>
      </form>
    </section>
  );
}
