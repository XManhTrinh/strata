"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { type RegionValues, RegionFields } from "@/features/workspaces/components/region-fields";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { updateWorkspaceSettings } from "../actions";

export type GeneralSettingsValues = RegionValues & { name: string; slug: string };

export function GeneralSettingsForm({
  initial,
  siteHost,
}: {
  initial: GeneralSettingsValues;
  siteHost: string;
}) {
  const t = useTranslations("settings.general");
  const to = useTranslations("onboarding.fields");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
    updateWorkspaceSettings.bind(null, workspace.id),
    idleFormState
  );
  const [values, setValues] = useState(initial);
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") void snackbar.showSnackbar(t("saved"));
  }, [state, snackbar, t]);

  const set = (field: keyof GeneralSettingsValues, next: string) =>
    setValues((current) => ({ ...current, [field]: next }));

  return (
    <section aria-labelledby="general-title" className="flex max-w-2xl flex-col gap-6">
      <h2 id="general-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <FormError error={state.error} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <TextField
          className="w-full"
          name="name"
          label={to("name")}
          required
          value={values.name}
          onChange={(next) => set("name", next)}
          invalid={Boolean(fieldErrors.name)}
          errorMessage={fieldErrors.name && te(fieldErrors.name)}
        />
        <TextField
          className="w-full"
          name="slug"
          label={to("slug")}
          required
          prefix={`${siteHost}/w/`}
          value={values.slug}
          onChange={(next) => set("slug", next.toLowerCase())}
          supportingText={t("addressHint")}
          invalid={Boolean(fieldErrors.slug)}
          errorMessage={fieldErrors.slug && te(fieldErrors.slug)}
        />
        <RegionFields value={values} onChange={set} fieldErrors={fieldErrors} />
        <Button type="submit" variant="filled" pending={pending} className="self-end">
          {t("save")}
        </Button>
      </form>
    </section>
  );
}
