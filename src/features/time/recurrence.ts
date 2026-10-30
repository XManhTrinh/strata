import { rrulestr } from "rrule";

export type Repeat = "none" | "weekly" | "fortnightly" | "monthly";

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

/** An RFC 5545 rule for a repeat ending on a date (inclusive), or null for none. */
export function repeatRule(repeat: Repeat, until: string | null): string | null {
  if (repeat === "none") return null;
  const freq = repeat === "monthly" ? "MONTHLY" : "WEEKLY";
  const interval = repeat === "fortnightly" ? 2 : 1;
  const end = until ? `;UNTIL=${until.replaceAll("-", "")}T235959Z` : "";
  return `FREQ=${freq};INTERVAL=${interval}${end}`;
}

/**
 * The occurrences of a repeating booking that touch a date range, each as long as the first.
 * Rules that can't be read give just the first occurrence.
 */
export function occurrences(
  booking: { startDate: string; endDate: string; recurrenceRule: string | null },
  from: string,
  to: string
): { startDate: string; endDate: string }[] {
  const length = (toDate(booking.endDate).getTime() - toDate(booking.startDate).getTime()) / DAY;
  const first = { startDate: booking.startDate, endDate: booking.endDate };
  const touches = (o: { startDate: string; endDate: string }) =>
    o.startDate <= to && o.endDate >= from;
  if (!booking.recurrenceRule) return touches(first) ? [first] : [];
  try {
    const rule = rrulestr(booking.recurrenceRule, { dtstart: toDate(booking.startDate) });
    // Starts up to the booking's length before the range still reach into it.
    const starts = rule.between(new Date(toDate(from).getTime() - length * DAY), toDate(to), true);
    return starts
      .map((d) => ({ startDate: toIso(d), endDate: toIso(new Date(d.getTime() + length * DAY)) }))
      .filter(touches);
  } catch {
    return touches(first) ? [first] : [];
  }
}
