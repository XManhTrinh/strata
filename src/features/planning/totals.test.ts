import { describe, expect, it } from "vitest";
import { pivotTotals } from "./totals";
import type { TotalsRow } from "./types";

const row = (group: string, period: string, fte: number, cost: number | null): TotalsRow => ({
  groupId: group,
  groupLabel: group.toUpperCase(),
  period,
  fte,
  headcount: Math.ceil(fte),
  cost,
  currency: "GBP",
});
const months = ["2027-01-01", "2027-02-01"];

describe("totals pivot", () => {
  it("puts months in columns and averages FTE over the months", () => {
    const table = pivotTotals(
      [row("a", "2027-01-01", 2, 100), row("a", "2027-02-01", 1, 50)],
      months,
      "fte"
    );
    expect(table.rows).toEqual([{ id: "a", label: "A", values: [2, 1], summary: 1.5 }]);
  });

  it("sums cost, and a month without time counts as 0", () => {
    const table = pivotTotals([row("a", "2027-02-01", 1, 50)], months, "cost");
    expect(table.rows[0]).toMatchObject({ values: [0, 50], summary: 50 });
  });

  it("keeps cost empty when the caller can't see it", () => {
    const table = pivotTotals([row("a", "2027-01-01", 1, null)], months, "cost");
    expect(table.rows[0]).toMatchObject({ values: [null, null], summary: null });
  });
});
