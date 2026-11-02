"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { downloadFile } from "@/lib/download";
import { useSnackbar } from "@/lib/snackbar";
import { deleteMyAccount } from "../actions";

export type AccountDeletion = { deletes: string[]; leaves: string[]; blocked: string[] };

/** Download everything about you, or delete your account (it says first what goes with it). */
export function YourData({ deletion }: { deletion: AccountDeletion }) {
  const t = useTranslations("account.data");
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteMyAccount();
      void snackbar.showSnackbar(te(result.error), { replace: true });
    });
  }

  return (
    <section aria-labelledby="your-data-title" className="max-w-form flex flex-col gap-3">
      <h2 id="your-data-title" className="text-title-large text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="tonal"
          leadingIcon={<Icon name="download" />}
          onPress={() => downloadFile("/account/data")}
        >
          {t("download")}
        </Button>
        <Button
          variant="text"
          leadingIcon={<Icon name="person_remove" />}
          onPress={() => setConfirming(true)}
        >
          {t("delete")}
        </Button>
      </div>
      {confirming && (
        <Dialog role="alertdialog" open onOpenChange={(open) => !open && setConfirming(false)}>
          <DialogTitle>{t("confirmTitle")}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            {deletion.blocked.length > 0 ? (
              <Alert severity="error">{t("blocked", { names: deletion.blocked.join(", ") })}</Alert>
            ) : (
              <>
                <p className="text-body-medium text-on-surface-variant">{t("confirmBody")}</p>
                {deletion.deletes.length > 0 && (
                  <Alert severity="warning">
                    {t("deletes", {
                      names: deletion.deletes.join(", "),
                      count: deletion.deletes.length,
                    })}
                  </Alert>
                )}
                {deletion.leaves.length > 0 && (
                  <p className="text-body-medium text-on-surface-variant">
                    {t("leaves", { names: deletion.leaves.join(", ") })}
                  </p>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onPress={() => setConfirming(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="text"
              pending={pending}
              disabled={deletion.blocked.length > 0}
              onPress={remove}
            >
              {t("confirm")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
}
