"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, Switch } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";
import { savePlanningSettings } from "../actions";
import type { FieldChoice, PlanningSettings } from "../types";

/** How this workspace plans: period, horizon, units and rules. */
export function PlanningSettingsForm({
  settings,
  fields,
}: {
  settings: PlanningSettings;
  fields: FieldChoice[];
}) {
  const t = useTranslations("planningSettings");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
    savePlanningSettings.bind(null, workspace.id),
    idleFormState
  );
  const [lifecycle, setLifecycle] = useState(settings.lifecycle);

  useEffect(() => {
    if (state.status === "success") void snackbar.showSnackbar(t("saved"));
  }, [state, snackbar, t]);

  const select = <K extends string>(
    name: keyof PlanningSettings,
    value: string,
    options: readonly K[],
    label: (option: K) => string,
    supportingText?: string
  ) => (
    <Select
      className="w-full"
      name={name}
      label={t(`${name as "period"}.label`)}
      defaultValue={value}
      supportingText={supportingText}
    >
      {options.map((option) => (
        <SelectItem key={option}>{label(option)}</SelectItem>
      ))}
    </Select>
  );

  return (
    <section aria-labelledby="planning-settings-title" className="max-w-form flex flex-col gap-6">
      <h2 id="planning-settings-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <FormError error={state.error} />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {select("period", settings.period, ["month", "quarter"] as const, (o) =>
            t(`period.${o}`)
          )}
          {select(
            "horizonYears",
            String(settings.horizonYears),
            ["1", "2", "3", "4", "5"] as const,
            (o) => t("horizonYears.option", { years: Number(o) })
          )}
          {select("displayUnit", settings.displayUnit, ["fte", "percent"] as const, (o) =>
            t(`displayUnit.${o}`)
          )}
          {select(
            "overAllocation",
            settings.overAllocation,
            ["warn", "block"] as const,
            (o) => t(`overAllocation.${o}`),
            t("overAllocation.help")
          )}
        </div>
        {select(
          "basis",
          settings.basis,
          ["person", "position"] as const,
          (o) => t(`basis.${o}`),
          t("basis.help")
        )}
        <Select
          className="w-full"
          name="costSplitFieldId"
          label={t("costSplitFieldId.label")}
          defaultValue={settings.costSplitFieldId ?? "none"}
          supportingText={t("costSplitFieldId.help")}
        >
          {[
            <SelectItem key="none">{t("costSplitFieldId.none")}</SelectItem>,
            ...fields.map((f) => <SelectItem key={f.id}>{f.label}</SelectItem>),
          ]}
        </Select>
        <div className="flex flex-col gap-1">
          <Switch checked={lifecycle} onCheckedChange={setLifecycle}>
            {t("lifecycle.label")}
          </Switch>
          <p className="text-body-small text-on-surface-variant">{t("lifecycle.help")}</p>
          <input type="hidden" name="lifecycle" value={String(lifecycle)} />
        </div>
        <Button type="submit" variant="filled" pending={pending} className="self-end">
          {t("save")}
        </Button>
      </form>
    </section>
  );
}
