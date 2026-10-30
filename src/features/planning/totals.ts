import type { TotalsRow } from "./types";

export type TotalsMeasure = "fte" | "headcount" | "cost";

export type TotalsTable = {
  months: string[];
  rows: { id: string; label: string; values: (number | null)[]; summary: number | null }[];
};

/**
 * Totals as one row per group and a column per month, with a summary: the average a month for
 * FTE and headcount, the sum for cost. Groups without a value get an empty label.
 */
export function pivotTotals(
  rows: TotalsRow[],
  months: string[],
  measure: TotalsMeasure
): TotalsTable {
  const groups = new Map<string, { label: string; byMonth: Map<string, number | null> }>();
  for (const r of rows) {
    const id = r.groupId ?? "";
    const group = groups.get(id) ?? { label: r.groupLabel ?? "", byMonth: new Map() };
    group.byMonth.set(
      r.period,
      measure === "fte" ? r.fte : measure === "headcount" ? r.headcount : r.cost
    );
    groups.set(id, group);
  }
  return {
    months,
    rows: [...groups].map(([id, g]) => {
      // Cost the caller can't see stays empty; otherwise a month without time is 0.
      const hidden = [...g.byMonth.values()].every((v) => v === null);
      const values = months.map((m) => (hidden ? null : (g.byMonth.get(m) ?? 0)));
      const numbers = values.filter((v): v is number => v !== null);
      const sum = numbers.reduce((a, b) => a + b, 0);
      return {
        id,
        label: g.label,
        values,
        summary: numbers.length === 0 ? null : measure === "cost" ? sum : sum / months.length,
      };
    }),
  };
}
