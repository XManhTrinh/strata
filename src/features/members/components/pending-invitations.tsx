"use client";

import { useTransition } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { useSnackbar } from "@/lib/snackbar";
import { resendInvitation, revokeInvitation } from "../actions";
import type { PendingInvitation, RoleOption } from "../types";

export function PendingInvitations({
  invitations,
  roles,
}: {
  invitations: PendingInvitation[];
  roles: RoleOption[];
}) {
  const t = useTranslations("members.pending");
  const te = useTranslations("errors");
  const format = useFormatter();
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const now = useNow().getTime();

  if (invitations.length === 0) {
    return <p className="text-body-medium text-on-surface-variant">{t("empty")}</p>;
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: Parameters<typeof te>[0] }>,
    done: string
  ) {
    startTransition(async () => {
      const result = await action();
      void snackbar.showSnackbar(result.ok ? done : te(result.error ?? "generic"));
    });
  }

  return (
    <List aria-label={t("title")}>
      {invitations.map((invitation) => {
        const expired = new Date(invitation.expiresAt).getTime() <= now;
        const roleName = roles.find((r) => r.id === invitation.roleId)?.name ?? "";
        return (
          <ListItem
            key={invitation.id}
            textValue={invitation.email}
            supportingText={`${roleName} · ${
              expired
                ? t("expired")
                : t("expires", {
                    date: format.dateTime(new Date(invitation.expiresAt), { dateStyle: "medium" }),
                  })
            }`}
            trailing={
              <span className="flex gap-1">
                <Button
                  variant="text"
                  disabled={pending}
                  onPress={() =>
                    run(
                      () => resendInvitation(invitation.id, invitation.email),
                      t("resent", { email: invitation.email })
                    )
                  }
                >
                  {t("resend")}
                </Button>
                <Button
                  variant="text"
                  disabled={pending}
                  onPress={() =>
                    run(
                      () => revokeInvitation(invitation.id),
                      t("revoked", { email: invitation.email })
                    )
                  }
                >
                  {t("revoke")}
                </Button>
              </span>
            }
          >
            {invitation.email}
          </ListItem>
        );
      })}
    </List>
  );
}
