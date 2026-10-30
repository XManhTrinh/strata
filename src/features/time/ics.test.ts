import { describe, expect, it } from "vitest";
import { feedCalendar } from "./ics";

const booking = {
  id: "b1",
  memberName: "Ana Pop",
  typeName: "Annual leave",
  title: null,
  startDate: "2026-11-02",
  endDate: "2026-11-03",
  startHalf: "full",
  endHalf: "full",
  startsAt: null,
  endsAt: null,
  status: "approved",
  recurrenceRule: null,
  updatedAt: "2026-10-30T10:00:00Z",
};
const labels = { busy: "Busy", half: "half day" };

describe("calendar feed", () => {
  it("writes all-day bookings with an exclusive end", () => {
    const ics = feedCalendar("Acme", [booking], labels);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261104");
    expect(ics).toContain("SUMMARY:Ana Pop: Annual leave");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("marks requests tentative, hides private types and keeps repeats", () => {
    const ics = feedCalendar(
      "Acme",
      [{ ...booking, typeName: null, status: "pending", recurrenceRule: "FREQ=WEEKLY;INTERVAL=1" }],
      labels
    );
    expect(ics).toContain("SUMMARY:Ana Pop: Busy");
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1");
  });

  it("escapes text and folds long lines", () => {
    const ics = feedCalendar(
      "Acme",
      [{ ...booking, title: `Offsite, day; one ${"x".repeat(80)}` }],
      labels
    );
    expect(ics).toContain("Offsite\\, day\; one");
    expect(ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true
    );
  });
});
