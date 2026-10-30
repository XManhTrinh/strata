"use client";

import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { type ErrorKey, type FormState, idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";

/** A dialog around one form: submits the action, then confirms in a snackbar and closes. */
export function FormDialog({
  title,
  submitLabel,
  action,
  done,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  /** The snackbar text once saved, given the submitted name. */
  done: (name: string) => string;
  onClose: () => void;
  /** The fields, given each field's error message. */
  children: (fieldError: (field: string) => string | undefined) => ReactNode;
}) {
  const t = useTranslations("common");
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [state, submit, pending] = useFormAction(action, idleFormState);
  const submittedName = useRef("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    submittedName.current = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    submit(event);
  }

  useEffect(() => {
    if (state.status !== "success") return;
    void snackbar.showSnackbar(done(submittedName.current), { replace: true });
    onClose();
  }, [state, done, onClose, snackbar]);

  const fieldError = (field: string) => {
    const key: ErrorKey | undefined = state.fieldErrors?.[field];
    return key && te(key);
  };

  return (
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <FormError error={state.error} />
          {children(fieldError)}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="text" pending={pending}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
