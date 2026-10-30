/** Dates for the calendar views: which days a view shows around a date, and where its arrows go. */

export type CalendarView = "month" | "week" | "list";

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(new Date(toDate(iso).getTime() + n * DAY));

/** The first and last day a view shows for a date (weeks start on the workspace's ISO weekday). */
export function viewRange(
  view: CalendarView,
  date: string,
  weekStart: number
): { from: string; to: string } {
  if (view === "month") {
    const d = toDate(date);
    const from = toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    const to = toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    return { from, to };
  }
  if (view === "week") {
    const isoDay = toDate(date).getUTCDay() || 7;
    const from = addDays(date, -((isoDay - weekStart + 7) % 7));
    return { from, to: addDays(from, 6) };
  }
  return { from: date, to: addDays(date, 27) };
}

/** The date the previous or next arrow opens. */
export function shiftDate(view: CalendarView, date: string, by: -1 | 1): string {
  if (view === "month") {
    const d = toDate(date);
    return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1)));
  }
  return addDays(date, by * (view === "week" ? 7 : 28));
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
