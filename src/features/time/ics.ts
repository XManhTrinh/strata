/** iCalendar (RFC 5545) output for calendar feeds: all-day bookings, timed events and repeats. */

export type FeedBooking = {
  id: string;
  memberName: string;
  typeName: string | null;
  title: string | null;
  startDate: string;
  endDate: string;
  startHalf: string;
  endHalf: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  recurrenceRule: string | null;
  updatedAt: string;
};

const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines over 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

const compactDate = (iso: string) => iso.replaceAll("-", "");
const compactTime = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const nextDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function feedCalendar(
  name: string,
  bookings: FeedBooking[],
  labels: { busy: string; half: string }
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Strata//Time off//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
  ];
  for (const b of bookings) {
    const what = b.title ?? b.typeName ?? labels.busy;
    const half = b.startHalf === "afternoon" || b.endHalf === "morning" ? ` (${labels.half})` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}-${escape(b.memberName).replace(/\W/g, "")}@strata`,
      `DTSTAMP:${compactTime(b.updatedAt)}`,
      ...(b.startsAt && b.endsAt
        ? [`DTSTART:${compactTime(b.startsAt)}`, `DTEND:${compactTime(b.endsAt)}`]
        : // All-day: the end date is exclusive.
          [
            `DTSTART;VALUE=DATE:${compactDate(b.startDate)}`,
            `DTEND;VALUE=DATE:${compactDate(nextDay(b.endDate))}`,
          ]),
      `SUMMARY:${escape(`${b.memberName}: ${what}${half}`)}`,
      `STATUS:${b.status === "pending" ? "TENTATIVE" : "CONFIRMED"}`,
      "TRANSP:TRANSPARENT",
      ...(b.recurrenceRule ? [`RRULE:${b.recurrenceRule}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
