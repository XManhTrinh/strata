"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Checkbox, IconButton } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useRunAction } from "@/features/structure/use-run-action";
import { cancelBooking } from "../time-off-actions";
import type { Balance, MyBooking, PendingApproval, RoleChoice, TimeType } from "../types";
import { useApprovalDecisions } from "./approvals-list";
import { useBookingDates } from "./date-range";
import { TimeTypeDialog } from "./time-type-dialog";

/** Requests shown in the panel before "See all". */
const SHOWN = 3;

export type LegendType = { name: string; color: string; icon: string };

/**
 * Beside the calendar on wide screens: your balances, what's waiting (for approvers, requests to
 * decide; for everyone else, their own requests), and the time types as a legend that filters the
 * calendar, which people who manage time settings can also add to and edit.
 */
export function CalendarPanel({
  balances,
  approvals,
  approvalsHref,
  myPending,
  legend,
  hidden,
  onToggle,
  manage,
}: {
  balances: Balance[];
  /** Requests to decide, for approvers; null for everyone else. */
  approvals: PendingApproval[] | null;
  approvalsHref: string;
  myPending: MyBooking[];
  legend: LegendType[];
  hidden: Set<string>;
  onToggle: (name: string) => void;
  /** The workspace's time types and roles, for people who manage time settings. */
  manage: { types: TimeType[]; roles: RoleChoice[] } | null;
}) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const dates = useBookingDates();
  const decisions = useApprovalDecisions();
  const [run, cancelling] = useRunAction();
  const [editing, setEditing] = useState<TimeType | "new" | null>(null);

  const heading = "text-title-small text-on-surface-variant";
  const card = "bg-surface-container-low flex flex-col gap-2 rounded-xl p-3";

  return (
    <aside aria-label={t("panel.label")} className="flex flex-col gap-6">
      {balances.length > 0 && (
        <section aria-labelledby="panel-balances" className="flex flex-col gap-2">
          <h2 id="panel-balances" className={heading}>
            {t("panel.balances")}
          </h2>
          {balances.map((b) => (
            <p key={b.timeTypeId} className="flex items-baseline justify-between gap-2">
              <span className="text-body-medium text-on-surface">{b.name}</span>
              <span className="text-title-medium text-on-surface">
                {t("panel.daysLeft", { days: format.number(b.available) })}
              </span>
            </p>
          ))}
        </section>
      )}

      {approvals ? (
        <section aria-labelledby="panel-waiting" className="flex flex-col gap-2">
          <h2 id="panel-waiting" className={heading}>
            {t("panel.waiting", { count: approvals.length })}
          </h2>
          {approvals.length === 0 ? (
            <p className="text-body-medium text-on-surface-variant">{t("approvals.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {approvals.slice(0, SHOWN).map((a) => (
                <li key={a.bookingId} className={card}>
                  <p className="text-body-medium text-on-surface">
                    {t("approvals.for", { name: a.memberName, type: a.typeName })}
                  </p>
                  <p className="text-body-small text-on-surface-variant">
                    {[dates(a), t("days", { days: a.workingDays })].join(" · ")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="text" onPress={() => decisions.decline(a)}>
                      {t("approvals.reject")}
                    </Button>
                    <Button
                      variant="tonal"
                      pending={decisions.pending}
                      onPress={() => decisions.approve(a)}
                    >
                      {t("approvals.approve")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {approvals.length > SHOWN && (
            <Button variant="text" href={approvalsHref} className="self-start">
              {t("panel.seeAll", { count: approvals.length })}
            </Button>
          )}
          {decisions.dialog}
        </section>
      ) : (
        <section aria-labelledby="panel-requests" className="flex flex-col gap-2">
          <h2 id="panel-requests" className={heading}>
            {t("panel.requests")}
          </h2>
          {myPending.length === 0 ? (
            <p className="text-body-medium text-on-surface-variant">{t("panel.noRequests")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {myPending.map((b) => (
                <li key={b.id} className={card}>
                  <p className="text-body-medium text-on-surface">{b.title ?? b.typeName}</p>
                  <p className="text-body-small text-on-surface-variant">
                    {[dates(b), t("days", { days: b.workingDays })].join(" · ")}
                  </p>
                  <Button
                    variant="text"
                    className="self-end"
                    pending={cancelling}
                    onPress={() => run(() => cancelBooking(b.id), t("mine.cancelled"))}
                  >
                    {t("mine.cancel")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {legend.length > 0 && (
        <section aria-labelledby="panel-types" className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id="panel-types" className={heading}>
              {t("panel.types")}
            </h2>
            {manage && (
              <IconButton
                variant="standard"
                aria-label={t("panel.addType")}
                icon={<Icon name="add" />}
                onPress={() => setEditing("new")}
              />
            )}
          </div>
          <ul className="flex flex-col">
            {legend.map((type) => {
              const editable = manage?.types.find((x) => x.name === type.name);
              return (
                <li key={type.name} className="flex items-center gap-1">
                  <Checkbox
                    className="min-w-0 flex-1"
                    checked={!hidden.has(type.name)}
                    onCheckedChange={() => onToggle(type.name)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span style={{ color: type.color }} className="flex">
                        <Icon name={type.icon} size={20} />
                      </span>
                      <span className="text-body-medium text-on-surface truncate">{type.name}</span>
                    </span>
                  </Checkbox>
                  {editable && (
                    <IconButton
                      variant="standard"
                      aria-label={t("panel.editType", { name: type.name })}
                      icon={<Icon name="edit" />}
                      onPress={() => setEditing(editable)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {manage && editing && (
        <TimeTypeDialog
          type={editing === "new" ? undefined : editing}
          roles={manage.roles}
          onClose={() => setEditing(null)}
        />
      )}
    </aside>
  );
}
