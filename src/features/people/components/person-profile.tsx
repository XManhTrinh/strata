"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, IconButton, List, ListItem, Tab, Tabs } from "@windmorph/react";
import { Avatar, Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { ItemMenu } from "@/components/ui/item-menu";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { setEndDate } from "../actions";
import type { FieldValue, JobChoices, PersonProfile } from "../types";
import { JobHistory } from "./job-history";
import { DetailsDialog, JobDialog, PayDialog } from "./person-dialogs";
import { PersonOverview } from "./person-overview";
import { EndDateDialog, FieldValueDialog } from "./value-dialogs";

type Open = "details" | "job" | "pay" | "end" | { field: FieldValue } | null;

export function PersonProfileView({
  person,
  choices,
}: {
  person: PersonProfile;
  choices: JobChoices;
}) {
  const t = useTranslations("person");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState<Open>(null);
  const [run] = useRunAction();
  const today = new Date().toISOString().slice(0, 10);
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  const money = (amount: number, currency: string) =>
    format.number(amount, { style: "currency", currency });
  const current = person.jobs.find(
    (j) => j.validFrom <= today && (!j.validTo || j.validTo > today)
  );
  const canEdit = person.access.includes("people.edit");
  const canEditPay = person.access.includes("people.edit_compensation");
  const close = () => setOpen(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <IconButton
          variant="standard"
          href={`/w/${workspace.slug}/people`}
          aria-label={t("back")}
          icon={<Icon name="arrow_back" />}
        />
        <Avatar name={person.fullName} src={person.avatarUrl ?? undefined} size="lg" decorative />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-headline-small text-on-surface">{person.fullName}</h1>
          <p className="text-body-medium text-on-surface-variant">
            {[current?.positionName, current?.unitName].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {person.startDate && person.startDate > today && (
              <Tag color="primary">{t("starts", { date: date(person.startDate) })}</Tag>
            )}
            {person.endDate && (
              <Tag color={person.endDate < today ? "neutral" : "warning"}>
                {t(person.endDate < today ? "left" : "leaves", { date: date(person.endDate) })}
              </Tag>
            )}
            {!person.hasAccount && <Tag color="neutral">{t("noAccount")}</Tag>}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="filled"
              leadingIcon={<Icon name="swap_horiz" />}
              onPress={() => setOpen("job")}
            >
              {t("jobRecord.change")}
            </Button>
            <ItemMenu
              label={t("actions")}
              onAction={(key) => {
                if (key === "details") setOpen("details");
                if (key === "end") setOpen("end");
                if (key === "remove-end")
                  run(() => setEndDate(person.id, null), t("leaving.removed"));
              }}
              actions={[
                { key: "details", label: t("details.edit"), icon: "edit" },
                {
                  key: "end",
                  label: t(person.endDate ? "leaving.change" : "leaving.set"),
                  icon: "event_busy",
                },
                Boolean(person.endDate) && {
                  key: "remove-end",
                  label: t("leaving.remove"),
                  icon: "event_available",
                },
              ]}
            />
          </div>
        )}
      </div>

      <Tabs variant="secondary" align="start" aria-label={person.fullName}>
        <Tab key="overview" title={t("tabs.overview")}>
          <div className="pt-4">
            <PersonOverview
              person={person}
              current={current}
              onEditField={(field) => setOpen({ field })}
            />
          </div>
        </Tab>
        <Tab key="history" title={t("tabs.history")}>
          <div className="pt-4">
            <JobHistory jobs={person.jobs} canEdit={canEdit} />
          </div>
        </Tab>
        {person.pay && (
          <Tab key="pay" title={t("tabs.pay")}>
            <div className="flex flex-col gap-2 pt-4">
              {canEditPay && (
                <Button variant="tonal" className="self-start" onPress={() => setOpen("pay")}>
                  {t("pay.change")}
                </Button>
              )}
              {person.pay.length === 0 ? (
                <p className="text-body-medium text-on-surface-variant">{t("pay.none")}</p>
              ) : (
                <List aria-label={t("pay.title")}>
                  {person.pay.map((p) => {
                    const amounts = [
                      p.annualSalary != null &&
                        t("pay.annual", { amount: money(p.annualSalary, p.currency) }),
                      p.dayRate != null && t("pay.daily", { amount: money(p.dayRate, p.currency) }),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    const period = p.validTo
                      ? t("jobRecord.fromTo", { from: date(p.validFrom), to: date(p.validTo) })
                      : t("jobRecord.fromOn", { from: date(p.validFrom) });
                    return (
                      <ListItem key={p.id} textValue={`${period} ${amounts}`} overline={period}>
                        {amounts}
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </div>
          </Tab>
        )}
      </Tabs>

      {open === "details" && <DetailsDialog person={person} onClose={close} />}
      {open === "job" && <JobDialog person={person} choices={choices} onClose={close} />}
      {open === "pay" && <PayDialog person={person} onClose={close} />}
      {open === "end" && <EndDateDialog person={person} onClose={close} />}
      {open && typeof open === "object" && (
        <FieldValueDialog person={person} field={open.field} onClose={close} />
      )}
    </div>
  );
}
