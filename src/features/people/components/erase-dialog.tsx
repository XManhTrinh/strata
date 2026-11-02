"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { useSnackbar } from "@/lib/snackbar";
import { erasePerson } from "../personal-data-actions";
import { FORM_DIALOG_CLASSES } from "@/components/ui/form-dialog";

/** Erasing a person can't be undone: it asks for the reason, and to check for disputes first. */
export function EraseDialog({
  memberId,
  name,
  onClose,
}: {
  memberId: string;
  name: string;
  onClose: () => void;
}) {
  const t = useTranslations("person.erase");
  const te = useTranslations("errors");
  const router = useRouter();
  const snackbar = useSnackbar();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function erase() {
    startTransition(async () => {
      const result = await erasePerson(memberId, reason);
      if (!result.ok) {
        void snackbar.showSnackbar(te(result.error), { replace: true });
        return;
      }
      void snackbar.showSnackbar(t("done", { name }), { replace: true });
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      role="alertdialog"
      open
      onOpenChange={(open) => !open && onClose()}
      classNames={FORM_DIALOG_CLASSES}
    >
      <DialogTitle>{t("title", { name })}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-2">
        <p className="text-body-medium text-on-surface-variant">{t("body")}</p>
        <Alert severity="warning">{t("disputes")}</Alert>
        <TextField
          className="w-full"
          label={t("reason")}
          value={reason}
          onChange={setReason}
          multiline
          rows={2}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("cancel")}
        </Button>
        <Button variant="text" pending={pending} disabled={!reason.trim()} onPress={erase}>
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
