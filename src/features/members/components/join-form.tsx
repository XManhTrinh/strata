"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import type { ErrorKey } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { requestToJoin, withdrawJoinRequest } from "../join-actions";

/** Asking to join through a link, or (while asked) waiting and able to withdraw. */
export function JoinForm({
  token,
  workspace,
  pendingRequestId,
  declinedBefore,
}: {
  token: string;
  workspace: string;
  pendingRequestId: string | null;
  declinedBefore: boolean;
}) {
  const t = useTranslations("join");
  const snackbar = useSnackbar();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<ErrorKey | undefined>();
  const [pending, startTransition] = useTransition();

  if (pendingRequestId) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-body-medium text-on-surface">
          {t("waiting", { workspace })}
        </p>
        <FormError error={error} />
        <Button
          variant="outlined"
          pending={pending}
          onPress={() =>
            startTransition(async () => {
              const result = await withdrawJoinRequest(pendingRequestId, token);
              if (result.ok) void snackbar.showSnackbar(t("withdrawn"));
              else setError(result.error);
            })
          }
        >
          {t("withdraw")}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await requestToJoin(token, message);
          if (result.ok) void snackbar.showSnackbar(t("asked"));
          else setError(result.error);
        });
      }}
    >
      {declinedBefore && (
        <p className="text-body-medium text-on-surface-variant">{t("declinedBefore")}</p>
      )}
      <FormError error={error} />
      <TextField
        className="w-full"
        label={t("message")}
        supportingText={t("messageHint")}
        value={message}
        onChange={setMessage}
        maxLength={500}
      />
      <Button type="submit" variant="filled" pending={pending}>
        {t("ask")}
      </Button>
    </form>
  );
}
