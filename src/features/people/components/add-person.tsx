"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { addPerson } from "../actions";
import type { JobChoices } from "../types";
import { JobFields } from "./job-fields";

/** "Add person" for people who may add anyone (people.edit across the workspace). */
export function AddPerson({ choices }: { choices: JobChoices }) {
  const t = useTranslations("person");
  const { workspace, permissions } = useWorkspace();
  const [open, setOpen] = useState(false);
  if (!permissions["people.edit"]?.includes("workspace")) return null;

  return (
    <>
      <Button
        variant="filled"
        leadingIcon={<Icon name="person_add" />}
        onPress={() => setOpen(true)}
      >
        {t("add.button")}
      </Button>
      {open && (
        <FormDialog
          title={t("add.title")}
          submitLabel={t("add.save")}
          action={addPerson.bind(null, workspace.id, workspace.slug)}
          done={() => ""}
          onClose={() => setOpen(false)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="fullName"
                label={t("details.fullName")}
                required
                invalid={Boolean(fieldError("fullName"))}
                errorMessage={fieldError("fullName")}
              />
              <TextField
                className="w-full"
                name="email"
                type="email"
                label={t("details.email")}
                invalid={Boolean(fieldError("email"))}
                errorMessage={fieldError("email")}
              />
              <TextField
                className="w-full"
                name="personKey"
                label={t("details.personKey")}
                supportingText={t("details.personKeyHelp")}
                invalid={Boolean(fieldError("personKey"))}
                errorMessage={fieldError("personKey")}
              />
              <IsoDateField
                name="startDate"
                label={t("details.startDate")}
                defaultValue={new Date().toISOString().slice(0, 10)}
                errorMessage={fieldError("startDate")}
              />
              <JobFields
                choices={choices}
                current={
                  choices.units[0]
                    ? ({ unitId: choices.units[0].id } as Parameters<
                        typeof JobFields
                      >[0]["current"])
                    : undefined
                }
                fieldError={fieldError}
              />
            </>
          )}
        </FormDialog>
      )}
    </>
  );
}
