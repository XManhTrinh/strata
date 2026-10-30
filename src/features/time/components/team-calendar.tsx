"use client";

import { useFormatter, useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { CalendarEntry } from "../types";
import { useBookingDates } from "./date-range";

/** Days of a month as ISO dates. */
function monthDays(month: string): string[] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * Who's away in a month: one row per person, one column per day (a table, so screen readers can
 * move by row and column). Phones get the same bookings as a list.
 */
export function TeamCalendar({
  month,
  entries,
  hrefFor,
}: {
  month: string;
  entries: CalendarEntry[];
  /** The page for another month (YYYY-MM). */
  hrefFor: (month: string) => string;
}) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const dates = useBookingDates();
  const days = monthDays(month);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const shift = (by: number) => {
    const d = new Date(Date.UTC(y, m - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthName = format.dateTime(new Date(Date.UTC(y, m - 1, 1)), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const people = [...new Map(entries.map((e) => [e.memberId, e.memberName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1])
  );
  const today = new Date().toISOString().slice(0, 10);
  const label = (e: CalendarEntry) => e.typeName ?? t("calendar.busy");
  const on = (memberId: string, day: string) =>
    entries.find((e) => e.memberId === memberId && e.startDate <= day && e.endDate >= day);

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconButton
          variant="standard"
          href={hrefFor(shift(-1))}
          aria-label={t("calendar.previous")}
          icon={<Icon name="chevron_left" />}
        />
        <h2 id="calendar-title" className="text-title-large text-on-surface min-w-48 text-center">
          {monthName}
        </h2>
        <IconButton
          variant="standard"
          href={hrefFor(shift(1))}
          aria-label={t("calendar.next")}
          icon={<Icon name="chevron_right" />}
        />
      </div>

      {people.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant">{t("calendar.empty")}</p>
      ) : (
        <>
          {/* Scrolls sideways on narrower screens, so keyboard users can focus it to scroll. */}
          <div
            className="medium:block focus-visible:ring-secondary hidden overflow-x-auto rounded-md outline-none focus-visible:ring-2"
            role="region"
            aria-label={t("calendar.label", { month: monthName })}
            // A scrolling region must take focus (WCAG 2.1.1), which this rule doesn't know.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
          >
            <table className="text-body-small border-separate border-spacing-0">
              <caption className="sr-only">{t("calendar.label", { month: monthName })}</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="bg-surface text-label-medium sticky start-0 z-10 min-w-40 px-2 text-start"
                  >
                    {t("calendar.person")}
                  </th>
                  {days.map((day) => {
                    const date = new Date(day);
                    const weekend = [0, 6].includes(date.getUTCDay());
                    return (
                      <th
                        key={day}
                        scope="col"
                        className={`text-label-small w-8 min-w-8 px-0 py-1 text-center font-normal ${weekend ? "text-on-surface-variant" : "text-on-surface"} ${day === today ? "bg-secondary-container rounded-t-md" : ""}`}
                      >
                        <span className="block">
                          {format.dateTime(date, { weekday: "narrow", timeZone: "UTC" })}
                        </span>
                        <span className="block">{date.getUTCDate()}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {people.map(([memberId, name]) => (
                  <tr key={memberId}>
                    <th
                      scope="row"
                      className="bg-surface text-body-medium sticky start-0 z-10 truncate px-2 py-1 text-start font-normal"
                    >
                      {name}
                    </th>
                    {days.map((day) => {
                      const entry = on(memberId, day);
                      const weekend = [0, 6].includes(new Date(day).getUTCDay());
                      const half =
                        entry &&
                        ((entry.startDate === day && entry.startHalf === "afternoon") ||
                          (entry.endDate === day && entry.endHalf === "morning"));
                      return (
                        <td
                          key={day}
                          className={`border-outline-variant h-9 border-b p-0.5 ${weekend ? "bg-surface-container" : ""}`}
                          aria-label={
                            entry
                              ? t("calendar.away", {
                                  name,
                                  type: label(entry),
                                  dates: dates(entry),
                                })
                              : undefined
                          }
                        >
                          {entry && (
                            <span
                              className={`block h-full rounded ${entry.status === "pending" ? "opacity-50" : ""}`}
                              style={{
                                background: half
                                  ? `linear-gradient(${entry.startDate === day ? "90deg, transparent 50%" : "90deg"}, ${entry.color} 50%, transparent 50%)`
                                  : entry.color,
                              }}
                              title={`${label(entry)} · ${dates(entry)}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <List aria-label={t("calendar.label", { month: monthName })} className="medium:hidden">
            {entries.map((e) => (
              <ListItem
                key={`${e.bookingId}-${e.memberId}`}
                textValue={`${e.memberName} ${label(e)}`}
                leading={
                  <span style={{ color: e.color }}>
                    <Icon name={e.icon} />
                  </span>
                }
                supportingText={`${label(e)} · ${dates(e)}`}
              >
                {e.memberName}
              </ListItem>
            ))}
          </List>
        </>
      )}
    </section>
  );
}
