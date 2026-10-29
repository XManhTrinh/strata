"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { AUDIT_TABLES, type AuditTable } from "../tables";

export type AuditEntry = {
  id: number;
  actorName: string | null;
  action: "insert" | "update" | "delete";
  table: string;
  changedFields: string[];
  at: string;
};

export function AuditLog({
  entries,
  olderHref,
  people,
}: {
  entries: AuditEntry[];
  olderHref: string | null;
  people: { id: string; name: string }[];
}) {
  const t = useTranslations("audit");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filtered = params.has("table") || params.has("actor");

  function setFilter(name: "table" | "actor", value: string) {
    const next = new URLSearchParams(params);
    next.delete("before");
    if (value === "all") next.delete(name);
    else next.set(name, value);
    router.push(next.size ? `${pathname}?${next}` : pathname);
  }

  return (
    <section aria-labelledby="audit-title" className="flex max-w-3xl flex-col gap-4">
      <h2 id="audit-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <div className="medium:flex-row flex flex-col gap-4">
        <Select
          className="medium:w-64 w-full"
          label={t("filterThing")}
          value={params.get("table") ?? "all"}
          onChange={(key) => key != null && setFilter("table", String(key))}
        >
          {["all", ...AUDIT_TABLES].map((table) => (
            <SelectItem key={table}>
              {table === "all" ? t("all") : t(`tables.${table as AuditTable}`)}
            </SelectItem>
          ))}
        </Select>
        <Select
          className="medium:w-64 w-full"
          label={t("filterPerson")}
          value={params.get("actor") ?? "all"}
          onChange={(key) => key != null && setFilter("actor", String(key))}
        >
          {[{ id: "all", name: t("all") }, ...people].map((person) => (
            <SelectItem key={person.id}>{person.name}</SelectItem>
          ))}
        </Select>
        {filtered && (
          <Button variant="text" className="self-center" onPress={() => router.push(pathname)}>
            {t("clear")}
          </Button>
        )}
      </div>
      {entries.length === 0 ? (
        <EmptyState
          titleAs="h3"
          icon={<Icon name="history" />}
          title={filtered ? t("emptyFiltered") : t("empty")}
        />
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
