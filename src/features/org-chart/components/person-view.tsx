"use client";

import { useTranslations } from "next-intl";
import { List, ListItem } from "@windmorph/react";
import { Avatar } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import type { ChartPerson } from "../types";

/** On phones: one person, their manager above and their direct reports below; tap to move. */
export function PersonView({
  people,
  startId,
  hrefFor,
  profileHref,
}: {
  people: ChartPerson[];
  startId: string | null;
  hrefFor: (person: ChartPerson) => string;
  profileHref: (person: ChartPerson) => string;
}) {
  const t = useTranslations("orgChart");
  const start = people.find((p) => p.id === startId) ?? people.find((p) => p.depth === 0);
  const tops = people.filter((p) => p.depth === 0);
  const detail = (p: ChartPerson) => [p.position, p.unit].filter(Boolean).join(" · ");
  const item = (p: ChartPerson) => (
    <ListItem
      key={p.id}
      href={hrefFor(p)}
      textValue={p.name}
      leading={<Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" decorative />}
      supportingText={detail(p)}
      trailing={
        p.directReports > 0 ? (
          <span className="text-label-medium">{p.directReports}</span>
        ) : undefined
      }
    >
      {p.name}
    </ListItem>
  );

  // Without one start person (the top of the organization), list everyone at the top.
  if (!startId) {
    return <List aria-label={t("chartLabel")}>{tops.map(item)}</List>;
  }
  if (!start) return null;

  const manager = people.find((p) => p.id === start.managerId);
  const reports = people.filter((p) => p.managerId === start.id && p.depth === 1);

  return (
    <div className="flex flex-col gap-4">
      {manager && (
        <section className="flex flex-col gap-1">
          <h2 className="text-title-small text-on-surface-variant px-4">{t("manager")}</h2>
          <List aria-label={t("manager")}>{[item(manager)]}</List>
        </section>
      )}
      <section className="bg-surface-container-low flex items-center gap-4 rounded-xl p-4">
        <Avatar name={start.name} src={start.avatarUrl ?? undefined} size="lg" decorative />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-title-large text-on-surface">{start.name}</h2>
          <p className="text-body-medium text-on-surface-variant">{detail(start)}</p>
          {start.managerHidden && (
            <p className="text-body-small text-on-surface-variant">{t("managerHidden")}</p>
          )}
          <a
            href={profileHref(start)}
            className="text-label-large text-primary mt-1 flex items-center gap-1"
          >
            {t("openProfile")} <Icon name="arrow_forward" size={18} />
          </a>
        </div>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="text-title-small text-on-surface-variant px-4">{t("reports")}</h2>
        {reports.length ? (
          <List aria-label={t("reports")}>{reports.map(item)}</List>
        ) : (
          <p className="text-body-medium text-on-surface-variant px-4">{t("noReports")}</p>
        )}
      </section>
    </div>
  );
}
