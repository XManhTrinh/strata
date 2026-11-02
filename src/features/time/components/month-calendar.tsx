"use client";

import { type PointerEvent, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { daysBetween } from "../calendar-range";
import type { CalendarEntry } from "../types";

/** Bars shown in a week before "+N more". */
const LANES = 3;

type Bar = { entry: CalendarEntry; start: number; span: number; lane: number };

/** Places a week's bookings in lanes so bars don't overlap: longest first, then by start. */
function placeBars(entries: CalendarEntry[], days: string[]): Bar[] {
  const lanes: number[] = [];
  return entries
    .map((entry) => {
      const cols = days.flatMap((d, i) => (d >= entry.startDate && d <= entry.endDate ? [i] : []));
      return { entry, start: cols[0] ?? -1, span: cols.length };
    })
    .filter((b) => b.span > 0)
    .sort((a, b) => a.start - b.start || b.span - a.span)
    .map((b) => {
      let lane = lanes.findIndex((end) => end <= b.start);
      if (lane === -1) lane = lanes.push(0) - 1;
      lanes[lane] = b.start + b.span;
      return { ...b, lane };
    });
}

/**
 * The month as weeks × days with each booking as a bar, like a wall calendar. Choosing a day,
 * or dragging across days, books time for them; days with more bookings than fit link to the
 * team view.
 */
export function MonthCalendar({
  from,
  to,
  month,
  entries,
  onBook,
  teamHref,
}: {
  /** The first and last day shown: whole weeks around the month. */
  from: string;
  to: string;
  /** Any day in the month, so days outside it are dimmed. */
  month: string;
  entries: CalendarEntry[];
  /** Books the chosen days, when the user may book. */
  onBook?: (start: string, end: string) => void;
  /** The team view of a day, for days with more than fit. */
  teamHref: (day: string) => string;
}) {
  const t = useTranslations("timeOff.calendar");
  const format = useFormatter();
  const [weekends, setWeekends] = useState(false);
  const [drag, setDrag] = useState<{ anchor: string; over: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = month.slice(0, 7);

  const allDays = daysBetween(from, to);
  const weeks: string[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));
  const isWeekend = (day: string) => [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
  const visible = (week: string[]) => (weekends ? week : week.filter((d) => !isWeekend(d)));
  const columns = visible(weeks[0] ?? []).length;

  const selected = (day: string) =>
    drag !== null &&
    day >= (drag.anchor < drag.over ? drag.anchor : drag.over) &&
    day <= (drag.anchor < drag.over ? drag.over : drag.anchor);

  // A drag ends wherever the pointer is let go.
  useEffect(() => {
    if (!drag) return;
    const end = () => {
      const [start, finish] =
        drag.anchor < drag.over ? [drag.anchor, drag.over] : [drag.over, drag.anchor];
      setDrag(null);
      onBook?.(start, finish);
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, [drag, onBook]);

  const dayLabel = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), { dateStyle: "full", timeZone: "UTC" });
  const short = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const describe = (e: CalendarEntry) =>
    [
      e.memberName,
      e.typeName ?? t("busy"),
      e.startDate === e.endDate
        ? short(e.startDate)
        : `${short(e.startDate)} – ${short(e.endDate)}`,
      e.status === "pending" && t("pending"),
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-medium text-on-surface-variant">
          {onBook ? t("bookHint") : t("calendarHint")}
        </p>
        <Button variant={weekends ? "tonal" : "outlined"} onPress={() => setWeekends((w) => !w)}>
          {t(weekends ? "hideWeekends" : "showWeekends")}
        </Button>
      </div>
      <div className="border-outline-variant overflow-hidden rounded-md border">
        <div
          aria-hidden
          className="bg-surface-container text-label-medium text-on-surface-variant grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {visible(weeks[0] ?? []).map((day) => (
            <span key={day} className="px-2 py-2">
              {format.dateTime(new Date(`${day}T00:00:00Z`), { weekday: "short", timeZone: "UTC" })}
            </span>
          ))}
        </div>
        {weeks.map((week) => {
          const days = visible(week);
          const bars = placeBars(entries, days);
          const shown = bars.filter((b) => b.lane < LANES);
          const hidden = (i: number) =>
            bars.filter((b) => b.lane >= LANES && i >= b.start && i < b.start + b.span).length;
          return (
            <div
              key={week[0]}
              role="group"
              aria-label={t("week", { date: short(week[0]!) })}
              className="border-outline-variant relative grid border-t"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `2.25rem repeat(${LANES}, 1.5rem) 1.5rem`,
              }}
            >
              {days.map((day, i) => {
                const inMonth = day.slice(0, 7) === monthKey;
                const more = hidden(i);
                const cell = `border-outline-variant relative border-s first:border-s-0 ${
                  selected(day) ? "bg-secondary-container" : ""
                } ${inMonth ? "" : "bg-surface-container-low"}`;
                return (
                  <div key={day} className={cell} style={{ gridColumn: i + 1, gridRow: "1 / -1" }}>
                    {onBook ? (
                      <button
                        type="button"
                        aria-label={t("bookDay", { date: dayLabel(day) })}
                        onPointerDown={(event: PointerEvent) => {
                          if (event.button === 0) setDrag({ anchor: day, over: day });
                        }}
                        onPointerEnter={() => drag && setDrag({ ...drag, over: day })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onBook(day, day);
                          }
                        }}
                        className="hover:bg-on-surface/8 focus-visible:outline-secondary absolute inset-0 flex cursor-pointer items-start justify-start outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        <DayNumber day={day} today={today} inMonth={inMonth} />
                      </button>
                    ) : (
                      <DayNumber day={day} today={today} inMonth={inMonth} />
                    )}
                    {more > 0 && (
                      <a
                        href={teamHref(day)}
                        className="text-label-small text-primary absolute start-1 bottom-0 z-20 inline-flex min-h-6 items-center px-1 hover:underline"
                      >
                        {t("more", { count: more })}
                      </a>
                    )}
                  </div>
                );
              })}
              {shown.map((bar) => (
                <p
                  key={`${bar.entry.bookingId}-${bar.entry.memberId}-${bar.entry.startDate}`}
                  title={describe(bar.entry)}
                  className={`text-label-small text-on-surface pointer-events-none relative z-10 mx-1 truncate rounded-sm border-s-4 px-1.5 leading-5 ${
                    bar.entry.status === "pending" ? "outline-outline outline-1 outline-dashed" : ""
                  }`}
                  style={{
                    gridColumn: `${bar.start + 1} / span ${bar.span}`,
                    gridRow: bar.lane + 2,
                    borderInlineStartColor: bar.entry.color,
                    background: `color-mix(in srgb, ${bar.entry.color} 22%, var(--md-sys-color-surface))`,
                  }}
                >
                  <span className="sr-only">{describe(bar.entry)}</span>
                  <span aria-hidden>
                    {t("bar", {
                      name: bar.entry.memberName,
                      type: bar.entry.typeName ?? t("busy"),
                    })}
                  </span>
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayNumber({ day, today, inMonth }: { day: string; today: string; inMonth: boolean }) {
  return (
    <span
      className={`text-label-medium mt-1 ms-1 inline-grid size-7 place-items-center rounded-full ${
        day === today
          ? "bg-primary text-on-primary"
          : inMonth
            ? "text-on-surface"
            : "text-on-surface-variant"
      }`}
    >
      {Number(day.slice(8))}
    </span>
  );
}
