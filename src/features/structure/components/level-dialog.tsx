"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveLevel } from "../actions";
import type { OrgLevel } from "../types";
import { FormDialog } from "./form-dialog";

/** Adds a level at the bottom, or renames `level`. */
export function LevelDialog({ level, onClose }: { level?: OrgLevel; onClose: () => void }) {
  const t = useTranslations("hierarchy");
  const { workspace } = useWorkspace();
  return (
    <FormDialog
      title={t(level ? "levels.dialogRename" : "levels.dialogAdd")}
      submitLabel={t(level ? "save" : "add")}
      action={saveLevel.bind(null, workspace.id, level?.id ?? null)}
      done={() => t(level ? "levels.renamed" : "levels.added")}
      onClose={onClose}
    >
      {(fieldError) => (
        <TextField
          className="w-full"
          name="name"
          label={t("levels.name")}
          required
          defaultValue={level?.name ?? ""}
          invalid={Boolean(fieldError("name"))}
          errorMessage={fieldError("name")}
        />
      )}
    </FormDialog>
  );
}
