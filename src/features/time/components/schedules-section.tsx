"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Checkbox, List, ListItem, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { ItemMenu } from "@/components/ui/item-menu";
import { setEntryArchived } from "@/features/structure/entry-actions";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveSchedule, setTimeDefault } from "../settings-actions";
import type { WorkSchedule } from "../types";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

export function SchedulesSection({ schedules }: { schedules: WorkSchedule[] }) {
  const t = useTranslations("timeSettings");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const [run] = useRunAction();
  const [editing, setEditing] = useState<WorkSchedule | "new" | null>(null);
  const schedule = editing === "new" ? null : editing;
  // 3 January 2000 was a Monday (ISO day 1).
  const dayName = (day: number, width: "short" | "long") =>
    format.dateTime(new Date(Date.UTC(2000, 0, 2 + day)), { weekday: width, timeZone: "UTC" });

  return (
    <section aria-labelledby="schedules-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="schedules-title" className="text-title-large text-on-surface">
          {t("schedules.title")}
        </h2>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => setEditing("new")}>
          {t("schedules.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">{t("schedules.intro")}</p>
      <List aria-label={t("schedules.title")}>
        {schedules.map((s) => (
          <ListItem
            key={s.id}
            textValue={s.name}
            supportingText={s.workingDays.map((d) => dayName(d, "short")).join(", ")}
            trailing={
              <div className="flex items-center gap-2">
                {s.isDefault && <Tag color="primary">{t("default")}</Tag>}
                {s.archived && <Tag color="neutral">{t("archived")}</Tag>}
                <ItemMenu
                  label={t("actions", { name: s.name })}
                  onAction={(key) => {
                    if (key === "edit") setEditing(s);
                    if (key === "default")
                      run(
                        () => setTimeDefault("work_schedules", s.id),
                        t("defaultSet", { name: s.name })
                      );
                    if (key === "archive" || key === "restore")
                      run(
                        () => setEntryArchived("work_schedules", s.id, key === "archive"),
                        t(key === "archive" ? "archivedDone" : "restored", { name: s.name })
                      );
                  }}
                  actions={[
                    { key: "edit", label: t("edit"), icon: "edit" },
                    !s.isDefault &&
                      !s.archived && { key: "default", label: t("makeDefault"), icon: "star" },
                    !s.isDefault &&
                      (s.archived
                        ? { key: "restore", label: t("restore"), icon: "unarchive" }
                        : { key: "archive", label: t("archive"), icon: "archive" }),
                  ]}
                />
              </div>
            }
          >
            {s.name}
          </ListItem>
        ))}
      </List>
      {editing && (
        <FormDialog
          title={t(schedule ? "schedules.dialogEdit" : "schedules.dialogAdd")}
          submitLabel={t(schedule ? "save" : "add")}
          action={saveSchedule.bind(null, workspace.id, schedule?.id ?? null)}
          done={(name) => t(schedule ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={schedule?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <fieldset className="flex flex-col gap-1">
                <legend className="text-body-medium text-on-surface-variant mb-1">
                  {t("schedules.days")}
                </legend>
                {DAYS.map((d) => (
                  <Checkbox
                    key={d}
                    name="days"
                    value={String(d)}
                    defaultChecked={(schedule?.workingDays ?? [1, 2, 3, 4, 5]).includes(d)}
                  >
                    {dayName(d, "long")}
                  </Checkbox>
                ))}
                {fieldError("days") && (
                  <p className="text-body-small text-error">{fieldError("days")}</p>
                )}
              </fieldset>
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
