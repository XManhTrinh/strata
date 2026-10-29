"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, TextField } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveEmploymentType } from "../job-actions";
import type { CostMethod, EmploymentType } from "../types";
import { FormDialog } from "./form-dialog";
import { OrderedEntries } from "./ordered-entries";

const COST_METHODS: CostMethod[] = ["annual_salary", "day_rate"];

export function EmploymentTypesSection({ types }: { types: EmploymentType[] }) {
  const t = useTranslations("jobs");
  const { workspace } = useWorkspace();
  const [editing, setEditing] = useState<EmploymentType | "new" | null>(null);
  const type = editing === "new" ? null : editing;
  const [costMethod, setCostMethod] = useState<string | null>(null);

  function open(next: EmploymentType | "new") {
    setCostMethod(next === "new" ? null : next.costMethod);
    setEditing(next);
  }

  return (
    <section aria-labelledby="employment-types-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="employment-types-title" className="text-title-large text-on-surface">
          {t("types.title")}
        </h3>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => open("new")}>
          {t("types.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {types.length ? t("types.intro") : t("types.empty")}
      </p>
      {types.length > 0 && (
        <OrderedEntries
          label={t("types.title")}
          table="employment_types"
          entries={types}
          supportingText={(e) => t(`types.${e.costMethod}`)}
          onEdit={open}
        />
      )}
      {editing && (
        <FormDialog
          title={t(type ? "types.dialogEdit" : "types.dialogAdd")}
          submitLabel={t(type ? "save" : "add")}
          action={saveEmploymentType.bind(null, workspace.id, type?.id ?? null)}
          done={(name) => t(type ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={type?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <Select
                className="w-full"
                name="costMethod"
                label={t("types.costMethod")}
                value={costMethod}
                onChange={(key) => key != null && setCostMethod(String(key))}
                invalid={Boolean(fieldError("costMethod"))}
                errorMessage={fieldError("costMethod")}
              >
                {COST_METHODS.map((method) => (
                  <SelectItem key={method} description={t(`types.${method}Help`)}>
                    {t(`types.${method}`)}
                  </SelectItem>
                ))}
              </Select>
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
