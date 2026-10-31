"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { ItemMenu } from "@/components/ui/item-menu";
import { setEntryArchived } from "@/features/structure/entry-actions";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { savePolicy, setTimeDefault } from "../settings-actions";
import type { AllowancePolicy, TimeType } from "../types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function AllowancesSettings({
  policies,
  types,
}: {
  policies: AllowancePolicy[];
  types: TimeType[];
}) {
  const t = useTranslations("timeSettings");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const [run] = useRunAction();
  const [editing, setEditing] = useState<AllowancePolicy | "new" | null>(null);
  const allowanceTypes = types.filter((type) => type.usesAllowance && !type.archived);
  const monthName = (month: number) =>
    format.dateTime(new Date(Date.UTC(2000, month - 1, 1)), { month: "long", timeZone: "UTC" });
  const policy = editing === "new" ? null : editing;
  const [prorate, setProrate] = useState(true);

  function open(next: AllowancePolicy | "new") {
    setProrate(next === "new" ? true : next.prorateBySchedule);
    setEditing(next);
  }

  return (
    <section aria-labelledby="allowances-title" className="max-w-form flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="allowances-title" className="text-headline-small text-on-surface">
          {t("policies.title")}
        </h2>
        <Button
          variant="filled"
          leadingIcon={<Icon name="add" />}
          disabled={allowanceTypes.length === 0}
          onPress={() => open("new")}
        >
          {t("policies.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {allowanceTypes.length ? t("policies.intro") : t("policies.noAllowanceTypes")}
      </p>
      {allowanceTypes.map((type) => {
        const list = policies.filter((p) => p.timeTypeId === type.id);
        return (
          <section key={type.id} className="flex flex-col gap-1">
            <h3 className="text-title-small text-on-surface-variant px-4">{type.name}</h3>
            {list.length === 0 ? (
              <p className="text-body-medium text-on-surface-variant px-4">{t("policies.empty")}</p>
            ) : (
              <List aria-label={type.name}>
                {list.map((p) => (
                  <ListItem
                    key={p.id}
                    textValue={p.name}
                    supportingText={t("policies.summary", {
                      days: p.daysPerYear,
                      accrual: t(`policies.accruals.${p.accrual}`),
                      month: monthName(p.yearStartMonth),
                    })}
                    trailing={
                      <div className="flex items-center gap-2">
                        {p.isDefault && <Tag color="primary">{t("default")}</Tag>}
                        {p.archived && <Tag color="neutral">{t("archived")}</Tag>}
                        <ItemMenu
                          label={t("actions", { name: p.name })}
                          onAction={(key) => {
                            if (key === "edit") open(p);
                            if (key === "default")
                              run(
                                () => setTimeDefault("allowance_policies", p.id),
                                t("defaultSet", { name: p.name })
                              );
                            if (key === "archive" || key === "restore")
                              run(
                                () =>
                                  setEntryArchived("allowance_policies", p.id, key === "archive"),
                                t(key === "archive" ? "archivedDone" : "restored", { name: p.name })
                              );
                          }}
                          actions={[
                            { key: "edit", label: t("edit"), icon: "edit" },
                            !p.isDefault &&
                              !p.archived && {
                                key: "default",
                                label: t("makeDefault"),
                                icon: "star",
                              },
                            !p.isDefault &&
                              (p.archived
                                ? { key: "restore", label: t("restore"), icon: "unarchive" }
                                : { key: "archive", label: t("archive"), icon: "archive" }),
                          ]}
                        />
                      </div>
                    }
                  >
                    {p.name}
                  </ListItem>
                ))}
              </List>
            )}
          </section>
        );
      })}
      {editing && (
        <FormDialog
          title={t(policy ? "policies.dialogEdit" : "policies.dialogAdd")}
          submitLabel={t(policy ? "save" : "add")}
          action={savePolicy.bind(null, workspace.id, policy?.id ?? null)}
          done={(name) => t(policy ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={policy?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <Select
                className="w-full"
                name="timeTypeId"
                label={t("policies.timeType")}
                defaultValue={policy?.timeTypeId ?? allowanceTypes[0]?.id}
              >
                {allowanceTypes.map((type) => (
                  <SelectItem key={type.id}>{type.name}</SelectItem>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  className="w-full"
                  name="daysPerYear"
                  type="number"
                  inputMode="decimal"
                  label={t("policies.daysPerYear")}
                  defaultValue={String(policy?.daysPerYear ?? 20)}
                  invalid={Boolean(fieldError("daysPerYear"))}
                  errorMessage={fieldError("daysPerYear")}
                />
                <Select
                  className="w-full"
                  name="yearStartMonth"
                  label={t("policies.yearStart")}
                  defaultValue={String(policy?.yearStartMonth ?? 1)}
                >
                  {MONTHS.map((m) => (
                    <SelectItem key={String(m)}>{monthName(m)}</SelectItem>
                  ))}
                </Select>
              </div>
              <Select
                className="w-full"
                name="accrual"
                label={t("policies.accrual")}
                defaultValue={policy?.accrual ?? "upfront"}
              >
                {(["upfront", "monthly"] as const).map((a) => (
                  <SelectItem key={a}>{t(`policies.accruals.${a}`)}</SelectItem>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  className="w-full"
                  name="carryOverMax"
                  type="number"
                  inputMode="decimal"
                  label={t("policies.carryOverMax")}
                  supportingText={t("policies.carryOverMaxHelp")}
                  defaultValue={policy?.carryOverMax == null ? "" : String(policy.carryOverMax)}
                />
                <TextField
                  className="w-full"
                  name="carryOverExpiresMonths"
                  type="number"
                  inputMode="numeric"
                  label={t("policies.carryOverExpires")}
                  supportingText={t("policies.carryOverExpiresHelp")}
                  defaultValue={
                    policy?.carryOverExpiresMonths == null
                      ? ""
                      : String(policy.carryOverExpiresMonths)
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Switch checked={prorate} onCheckedChange={setProrate}>
                  {t("policies.prorate")}
                </Switch>
                <span className="text-body-small text-on-surface-variant">
                  {t("policies.prorateHelp")}
                </span>
                <input type="hidden" name="prorateBySchedule" value={String(prorate)} />
              </div>
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
