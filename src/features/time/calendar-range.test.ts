import { describe, expect, it } from "vitest";
import { daysBetween, shiftDate, viewRange } from "./calendar-range";

describe("calendar ranges", () => {
  it("shows a whole month", () => {
    expect(viewRange("month", "2026-02-14", 1)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("starts weeks on the workspace's first day", () => {
    // Wednesday 4 November 2026.
    expect(viewRange("week", "2026-11-04", 1)).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(viewRange("week", "2026-11-04", 7)).toEqual({ from: "2026-11-01", to: "2026-11-07" });
  });
  it("lists four weeks and moves by a view at a time", () => {
    expect(viewRange("list", "2026-11-04", 1)).toEqual({ from: "2026-11-04", to: "2026-12-01" });
    expect(shiftDate("month", "2026-01-31", 1)).toBe("2026-02-01");
    expect(shiftDate("week", "2026-11-04", -1)).toBe("2026-10-28");
    expect(daysBetween("2026-11-29", "2026-12-02")).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
  });
});
