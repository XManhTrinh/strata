"use client";

import { useEffect } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, TextField } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { FormError } from "@/features/auth/components/form-error";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";
import { saveRetention } from "../personal-data-actions";
import type { Erasure, RetentionRules } from "../retention";

const RULES = [
  "anonymiseLeaversMonths",
  "privateNotesMonths",
  "auditLogMonths",
  "stagedImportsDays",
  "notificationsMonths",
] as const satisfies readonly (keyof RetentionRules)[];

/** How long this workspace keeps personal data, and who has been erased. */
export function PersonalDataSettings({
  rules,
  erasures,
}: {
  rules: RetentionRules;
  erasures: Erasure[];
}) {
  const t = useTranslations("personalDataSettings");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
    saveRetention.bind(null, workspace.id),
    idleFormState
  );

  useEffect(() => {
    if (state.status === "success") void snackbar.showSnackbar(t("saved"));
  }, [state, snackbar, t]);

  return (
    <div className="max-w-form flex flex-col gap-10">
      <section aria-labelledby="retention-title" className="flex flex-col gap-6">
        <h2 id="retention-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
        <FormError error={state.error} />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {RULES.map((rule) => {
            const error = state.fieldErrors?.[rule];
            return (
              <TextField
                key={rule}
                className="w-full"
                name={rule}
                type="number"
                inputMode="numeric"
                label={t(`${rule}.label`)}
                supportingText={t(`${rule}.help`)}
                defaultValue={rules[rule] === null ? "" : String(rules[rule])}
                invalid={Boolean(error)}
                errorMessage={error ? tErrors(error) : undefined}
              />
            );
          })}
          <Button type="submit" variant="filled" pending={pending} className="self-end">
            {t("save")}
          </Button>
        </form>
      </section>

      <section aria-labelledby="erasures-title" className="flex flex-col gap-4">
        <h2 id="erasures-title" className="text-title-large text-on-surface">
          {t("erasures")}
        </h2>
        {erasures.length === 0 ? (
          <EmptyState titleAs="h3" icon={<Icon name="person_off" />} title={t("noErasures")} />
        ) : (
          <List aria-label={t("erasures")}>
            {erasures.map((e) => (
              <ListItem
                key={e.id}
                textValue={e.reason}
                overline={format.dateTime(new Date(e.at), { dateStyle: "medium" })}
                supportingText={t(`kind.${e.kind}`)}
              >
                {e.reason}
              </ListItem>
            ))}
          </List>
        )}
      </section>
    </div>
  );
}
