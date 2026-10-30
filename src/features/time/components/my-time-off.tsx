"use client";

import { useFormatter, useTranslations } from "next-intl";
import { List, ListItem } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { ItemMenu } from "@/components/ui/item-menu";
import { useRunAction } from "@/features/structure/use-run-action";
import { cancelBooking } from "../time-off-actions";
import type { Balance, MyBooking } from "../types";
import { useBookingDates } from "./date-range";

const STATUS_COLOR = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
} as const;

/** Balances for each allowance type, then the person's bookings with their status. */
export function MyTimeOff({ balances, bookings }: { balances: Balance[]; bookings: MyBooking[] }) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const dates = useBookingDates();
  const [run] = useRunAction();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="balances-title" className="flex flex-col gap-3">
        <h2 id="balances-title" className="text-title-large text-on-surface">
          {t("balances.title")}
        </h2>
        {balances.length === 0 && (
          <p className="text-body-medium text-on-surface-variant">{t("balances.none")}</p>
        )}
        <div className="medium:grid-cols-2 expanded:grid-cols-3 grid gap-3">
          {balances.map((b) => (
            <article
              key={b.timeTypeId}
              className="bg-surface-container-low flex flex-col gap-2 rounded-xl p-4"
            >
              <h3 className="text-title-medium text-on-surface">{b.name}</h3>
              <p className="text-headline-medium text-primary tabular-nums">
                {t("balances.available", { days: b.available })}
              </p>
              <dl className="text-body-medium text-on-surface-variant grid grid-cols-2 gap-x-4">
                {(["entitled", "carriedOver", "adjusted", "used", "requested", "expired"] as const)
                  .filter((k) => b[k] !== 0 || k === "entitled")
                  .map((k) => (
                    <div key={k} className="contents">
                      <dt>{t(`balances.${k === "carriedOver" ? "carried" : k}`)}</dt>
                      <dd className="text-end tabular-nums">{b[k]}</dd>
                    </div>
                  ))}
              </dl>
              <p className="text-body-small text-on-surface-variant">
                {t("balances.year", {
                  date: format.dateTime(new Date(b.leaveYear), {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  }),
                })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="bookings-title" className="flex flex-col gap-2">
        <h2 id="bookings-title" className="text-title-large text-on-surface">
          {t("mine.title")}
        </h2>
        {bookings.length === 0 ? (
          <p className="text-body-medium text-on-surface-variant">{t("mine.empty")}</p>
        ) : (
          <List aria-label={t("mine.title")}>
            {bookings.map((b) => {
              const when = dates(b);
              return (
                <ListItem
                  key={b.id}
                  textValue={`${b.typeName} ${when}`}
                  leading={
                    <span style={{ color: b.color }}>
                      <Icon name={b.icon} />
                    </span>
                  }
                  supportingText={[when, b.workingDays ? t("days", { days: b.workingDays }) : null]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    <div className="flex items-center gap-2">
                      <Tag color={STATUS_COLOR[b.status]}>{t(`status.${b.status}`)}</Tag>
                      {(b.status === "pending" || b.status === "approved") &&
                        b.endDate >= today && (
                          <ItemMenu
                            label={t("mine.actions", { name: b.typeName })}
                            onAction={() => run(() => cancelBooking(b.id), t("mine.cancelled"))}
                            actions={[
                              { key: "cancel", label: t("mine.cancel"), icon: "event_busy" },
                            ]}
                          />
                        )}
                    </div>
                  }
                >
                  {b.title ?? b.typeName}
                </ListItem>
              );
            })}
          </List>
        )}
      </section>
    </div>
  );
}
