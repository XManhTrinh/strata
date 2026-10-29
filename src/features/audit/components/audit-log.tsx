"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export type AuditEntry = {
  id: number;
  actorName: string | null;
  action: "insert" | "update" | "delete";
  table: string;
  changedFields: string[];
  at: string;
};

type AuditTable =
  | "workspaces"
  | "workspace_features"
  | "members"
  | "roles"
  | "role_permissions"
  | "member_roles"
  | "invitations";

export function AuditLog({
  entries,
  olderHref,
}: {
  entries: AuditEntry[];
  olderHref: string | null;
}) {
  const t = useTranslations("audit");
  const format = useFormatter();

  return (
    <section aria-labelledby="audit-title" className="flex max-w-3xl flex-col gap-4">
      <h2 id="audit-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      {entries.length === 0 ? (
        <EmptyState titleAs="h3" icon={<Icon name="history" />} title={t("empty")} />
      ) : (
        <List aria-label={t("title")}>
          {entries.map((entry) => {
            const summary = t("summary", {
              actor: entry.actorName ?? t("someone"),
              action: t(`actions.${entry.action}`),
              thing: t(`tables.${entry.table as AuditTable}`),
            });
            return (
              <ListItem
                key={String(entry.id)}
                textValue={summary}
                overline={format.dateTime(new Date(entry.at), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                supportingText={
                  entry.changedFields.length > 0
                    ? t("fields", { fields: entry.changedFields.join(", ") })
                    : undefined
                }
              >
                {summary}
              </ListItem>
            );
          })}
        </List>
      )}
      {olderHref && (
        <Button variant="outlined" href={olderHref} className="self-start">
          {t("older")}
        </Button>
      )}
    </section>
  );
}
