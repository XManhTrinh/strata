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

/** "Import" for importers and "Add person" for people who may add anyone (people.edit across the workspace). */
export function AddPerson({ choices }: { choices: JobChoices }) {
  const t = useTranslations("person");
  const ti = useTranslations("import");
  const { workspace, permissions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const canImport = (permissions["people.import"]?.length ?? 0) > 0;
  if (!permissions["people.edit"]?.includes("workspace") && !canImport) return null;

  return (
    <div className="flex gap-2">
      {canImport && (
        <Button
          variant="tonal"
          leadingIcon={<Icon name="upload_file" />}
          href={`/w/${workspace.slug}/people/import`}
        >
          {ti("button")}
        </Button>
      )}
      {permissions["people.edit"]?.includes("workspace") && (
        <Button
          variant="filled"
          leadingIcon={<Icon name="person_add" />}
          onPress={() => setOpen(true)}
        >
          {t("add.button")}
        </Button>
      )}
      {open && (
        <FormDialog
          title={t("add.title")}
          submitLabel={t("add.save")}
          action={addPerson.bind(null, workspace.id, workspace.slug)}
          // Saving opens the new person's profile, so no snackbar is needed.
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
                defaultUnitId={choices.units[0]?.id}
                fieldError={fieldError}
              />
            </>
          )}
        </FormDialog>
      )}
    </div>
  );
}
