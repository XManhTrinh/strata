"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";
import { saveLevel } from "../actions";
import type { OrgLevel } from "../types";

/** Adds a level at the bottom, or renames `level`. */
export function LevelDialog({ level, onClose }: { level?: OrgLevel; onClose: () => void }) {
  const t = useTranslations("hierarchy");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
    saveLevel.bind(null, workspace.id, level?.id ?? null),
    idleFormState
  );

  useEffect(() => {
    if (state.status !== "success") return;
    void snackbar.showSnackbar(t(level ? "levels.renamed" : "levels.added"), { replace: true });
    onClose();
  }, [state, level, onClose, snackbar, t]);

  return (
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogTitle>{t(level ? "levels.dialogRename" : "levels.dialogAdd")}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <FormError error={state.error} />
          <TextField
            className="w-full"
            name="name"
            label={t("levels.name")}
            required
            defaultValue={level?.name ?? ""}
            invalid={Boolean(state.fieldErrors?.name)}
            errorMessage={state.fieldErrors?.name && te(state.fieldErrors.name)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="text" pending={pending}>
            {t(level ? "save" : "add")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
