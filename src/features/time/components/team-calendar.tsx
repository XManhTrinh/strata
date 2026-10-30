"use client";

import { useFormatter, useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { type CalendarView, daysBetween } from "../calendar-range";
import type { CalendarEntry } from "../types";
import { useBookingDates } from "./date-range";

/**
 * Who's away: in a month or week, one row per person and one column per day (a table, so screen
 * readers move by row and column); in the list view, and always on phones, bookings in order.
 */
export function TeamCalendar({
  view,
  from,
  to,
  entries,
  previousHref,
  nextHref,
}: {
  view: CalendarView;
  from: string;
  to: string;
  entries: CalendarEntry[];
  previousHref: string;
  nextHref: string;
}) {
  const t = useTranslations("timeOff");
  const format = useFormatter();
  const dates = useBookingDates();
  const days = daysBetween(from, to);
  const day = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  const monthName =
    view === "month"
      ? format.dateTime(new Date(from), { month: "long", year: "numeric", timeZone: "UTC" })
      : view === "week"
        ? t("calendar.weekOf", { date: day(from) })
        : t("calendar.listFrom", { date: day(from) });
  const arrow = (direction: "previous" | "next") =>
    t(
      view === "month"
        ? `calendar.${direction}`
        : view === "week"
          ? `calendar.${direction}Week`
          : `calendar.${direction}List`
    );
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
          href={previousHref}
          aria-label={arrow("previous")}
          icon={<Icon name="chevron_left" />}
        />
        <h2 id="calendar-title" className="text-title-large text-on-surface min-w-48 text-center">
          {monthName}
        </h2>
        <IconButton
          variant="standard"
          href={nextHref}
          aria-label={arrow("next")}
          icon={<Icon name="chevron_right" />}
        />
      </div>

      {people.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant">
          {t(view === "list" ? "calendar.listEmpty" : "calendar.empty")}
        </p>
      ) : (
        <>
          {/* Scrolls sideways on narrower screens, so keyboard users can focus it to scroll. */}
          <div
            className={`focus-visible:ring-secondary hidden overflow-x-auto rounded-md outline-none focus-visible:ring-2 ${view === "list" ? "" : "medium:block"}`}
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
          <List
            aria-label={t("calendar.label", { month: monthName })}
            className={view === "list" ? "" : "medium:hidden"}
          >
            {entries.map((e) => (
              <ListItem
                key={`${e.bookingId}-${e.memberId}`}
                textValue={`${e.memberName} ${label(e)}`}
                leading={
                  <span style={{ color: e.color }}>
                    <Icon name={e.icon} />
                  </span>
                }
                supportingText={[label(e), dates(e), e.repeats && t("repeating")]
                  .filter(Boolean)
                  .join(" · ")}
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
