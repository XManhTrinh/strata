import { describe, expect, it } from "vitest";
import { occurrences, repeatRule } from "./recurrence";

describe("repeating events", () => {
  it("writes rules for the repeats people choose", () => {
    expect(repeatRule("none", null)).toBeNull();
    expect(repeatRule("weekly", "2026-12-31")).toBe(
      "FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T235959Z"
    );
    expect(repeatRule("fortnightly", null)).toBe("FREQ=WEEKLY;INTERVAL=2");
    expect(repeatRule("monthly", null)).toBe("FREQ=MONTHLY;INTERVAL=1");
  });

  it("finds the occurrences in a range, each as long as the first", () => {
    const weeklyTwoDays = {
      startDate: "2026-11-02",
      endDate: "2026-11-03",
      recurrenceRule: repeatRule("weekly", "2026-11-30"),
    };
    expect(occurrences(weeklyTwoDays, "2026-11-10", "2026-11-23")).toEqual([
      { startDate: "2026-11-09", endDate: "2026-11-10" },
      { startDate: "2026-11-16", endDate: "2026-11-17" },
      { startDate: "2026-11-23", endDate: "2026-11-24" },
    ]);
    // The last one starts on the end date and runs into the next month.
    expect(occurrences(weeklyTwoDays, "2026-12-01", "2026-12-31")).toEqual([
      { startDate: "2026-11-30", endDate: "2026-12-01" },
    ]);
    expect(occurrences(weeklyTwoDays, "2026-12-02", "2026-12-31")).toEqual([]);
  });

  it("treats one-off bookings and unreadable rules as a single occurrence", () => {
    const once = { startDate: "2026-11-02", endDate: "2026-11-02", recurrenceRule: null };
    expect(occurrences(once, "2026-11-01", "2026-11-30")).toEqual([
      { startDate: "2026-11-02", endDate: "2026-11-02" },
    ]);
    expect(
      occurrences({ ...once, recurrenceRule: "NONSENSE" }, "2026-11-01", "2026-11-30")
    ).toHaveLength(1);
  });
});
