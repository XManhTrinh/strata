"use client";

import { useFormAction } from "@/lib/use-form-action";
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
import { createRole } from "../actions";

/** Creates a role, or a copy of `copyFrom` (name prefilled as "<name> (copy)"). */
export function NewRoleDialog({
  copyFrom,
  onClose,
}: {
  copyFrom?: { id: string; name: string; description: string };
  onClose: () => void;
}) {
  const t = useTranslations("roles");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const [state, onSubmit, pending] = useFormAction(
    createRole.bind(null, workspace.id, workspace.slug, copyFrom?.id ?? null),
    idleFormState
  );

  return (
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogTitle>{copyFrom ? t("duplicate") : t("newRole")}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <FormError error={state.error} />
          <TextField
            className="w-full"
            name="name"
            label={t("fields.name")}
            required
            defaultValue={copyFrom ? t("copyOf", { name: copyFrom.name }) : ""}
            invalid={Boolean(state.fieldErrors?.name)}
            errorMessage={state.fieldErrors?.name && te(state.fieldErrors.name)}
          />
          <TextField
            className="w-full"
            name="description"
            label={t("fields.description")}
            multiline
            rows={2}
            defaultValue={copyFrom?.description ?? ""}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="text" pending={pending}>
            {t("create")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
