"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useFormAction } from "@/lib/use-form-action";
import { saveFieldOption } from "../field-actions";
import type { CustomField, FieldOption } from "../types";
import { FormDialog } from "./form-dialog";
import { OrderedEntries } from "./ordered-entries";

/** A choice field's options: add at the end, rename, reorder and archive. */
export function OptionsDialog({ field, onClose }: { field: CustomField; onClose: () => void }) {
  const t = useTranslations("fields");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const [renaming, setRenaming] = useState<FieldOption | null>(null);
  const [state, onSubmit, pending] = useFormAction(
    saveFieldOption.bind(null, workspace.id, field.id, null),
    idleFormState
  );
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Ready for the next option once one is added.
  useEffect(() => {
    if (state.status !== "success") return;
    form.current?.reset();
    input.current?.focus();
  }, [state]);

  return (
    <Dialog role="dialog" closedBy="closerequest" open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("optionsTitle", { name: field.name })}</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        {field.options.length === 0 ? (
          <p className="text-body-medium text-on-surface-variant">{t("optionsEmpty")}</p>
        ) : (
          <OrderedEntries
            label={t("options")}
            table="custom_field_options"
            entries={field.options}
            onEdit={setRenaming}
          />
        )}
        <form ref={form} onSubmit={onSubmit} noValidate className="flex items-start gap-2">
          <TextField
            ref={input}
            className="flex-1"
            name="name"
            label={t("newOption")}
            invalid={Boolean(state.status === "error" && state.fieldErrors?.name)}
            errorMessage={state.fieldErrors?.name && te(state.fieldErrors.name)}
          />
          <Button type="submit" variant="tonal" pending={pending} className="mt-2">
            {t("addOption")}
          </Button>
        </form>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("done")}
        </Button>
      </DialogActions>
      {renaming && (
        <FormDialog
          title={t("editOption")}
          submitLabel={t("save")}
          action={saveFieldOption.bind(null, workspace.id, field.id, renaming.id)}
          done={(name) => t("saved", { name })}
          onClose={() => setRenaming(null)}
        >
          {(fieldError) => (
            <TextField
              className="w-full"
              name="name"
              label={t("label")}
              required
              defaultValue={renaming.name}
              invalid={Boolean(fieldError("name"))}
              errorMessage={fieldError("name")}
            />
          )}
        </FormDialog>
      )}
    </Dialog>
  );
}
