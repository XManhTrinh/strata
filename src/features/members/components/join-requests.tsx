"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem } from "@windmorph/react";
import { useSnackbar } from "@/lib/snackbar";
import { decideJoinRequest } from "../join-actions";
import type { JoinRequest, RoleOption } from "../types";

/** People asking to join through the link: approve with a role you could give, or decline. */
export function JoinRequests({
  requests,
  roles,
  defaultRoleId,
}: {
  requests: JoinRequest[];
  roles: RoleOption[];
  defaultRoleId: string | null;
}) {
  const t = useTranslations("members.joinRequests");
  const te = useTranslations("errors");
  const format = useFormatter();
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const fallback = defaultRoleId ?? roles.find((r) => r.templateRoleKey === "member")?.id ?? "";
  const [roleFor, setRoleFor] = useState<Record<string, string>>({});

  function decide(request: JoinRequest, approve: boolean) {
    startTransition(async () => {
      const result = await decideJoinRequest(
        request.id,
        approve,
        approve ? (roleFor[request.id] ?? fallback) : null
      );
      void snackbar.showSnackbar(
        result.ok
          ? t(approve ? "approved" : "declined", { name: request.fullName })
          : te(result.error)
      );
    });
  }

  return (
    <section aria-labelledby="join-requests-title" className="flex flex-col gap-3">
      <h3 id="join-requests-title" className="text-title-large text-on-surface">
        {t("title", { count: requests.length })}
      </h3>
      {requests.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant">{t("empty")}</p>
      ) : (
        <List aria-label={t("title", { count: requests.length })} className="max-w-form">
          {requests.map((r) => (
            <ListItem
              key={r.id}
              textValue={r.fullName}
              supportingText={[
                r.email,
                r.message,
                format.dateTime(new Date(r.createdAt), { dateStyle: "medium" }),
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={
                <div className="flex items-center gap-2">
                  <Select
                    searchable={roles.length > 7}
                    labels={{ search: t("role", { name: r.fullName }) }}
                    className="w-40"
                    aria-label={t("role", { name: r.fullName })}
                    value={roleFor[r.id] ?? fallback}
                    onChange={(key) =>
                      key != null && setRoleFor((current) => ({ ...current, [r.id]: String(key) }))
                    }
                  >
                    {roles.map((role) => (
                      <SelectItem key={role.id}>{role.name}</SelectItem>
                    ))}
                  </Select>
                  <Button variant="text" disabled={pending} onPress={() => decide(r, false)}>
                    {t("decline")}
                  </Button>
                  <Button variant="tonal" disabled={pending} onPress={() => decide(r, true)}>
                    {t("approve")}
                  </Button>
                </div>
              }
            >
              {r.fullName}
            </ListItem>
          ))}
        </List>
      )}
    </section>
  );
}
