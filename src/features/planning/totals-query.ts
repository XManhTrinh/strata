import "server-only";
import { listHierarchy } from "@/features/structure/queries";
import { listFieldChoices, getPlanningSettings } from "./queries";
import { listScenarios, scenarioTotals } from "./scenario-queries";
import { type TotalsMeasure, type TotalsTable, pivotTotals } from "./totals";
import type { FieldChoice, Scenario } from "./types";

export type TotalsQuery = {
  scenarioId: string | null;
  /** "unit", or a custom field's id. */
  by: string;
  unitId: string | null;
  measure: TotalsMeasure;
  from: string | null;
  to: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-\d{2}-01$/;

export function parseTotalsQuery(raw: Record<string, string | undefined>): TotalsQuery {
  const id = (v: string | undefined) => (v && UUID.test(v) ? v : null);
  return {
    scenarioId: id(raw.scenario),
    by: id(raw.by) ?? "unit",
    unitId: id(raw.unit),
    measure: raw.measure === "headcount" || raw.measure === "cost" ? raw.measure : "fte",
    from: raw.from && MONTH.test(raw.from) ? raw.from : null,
    to: raw.to && MONTH.test(raw.to) ? raw.to : null,
  };
}

function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  const [y, m] = first.split("-").map(Number) as [number, number];
  for (let i = 0; ; i++) {
    const month = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    if (month > last) return months;
    months.push(month);
  }
}

export type TotalsView = {
  scenarios: Scenario[];
  scenario: Scenario | null;
  fields: FieldChoice[];
  costSplitFieldId: string | null;
  /** The scenario's months, to choose a range from. */
  scenarioMonths: string[];
  query: TotalsQuery & { from: string; to: string };
  table: TotalsTable;
  /** The units from the root down to the one shown, for going back up. */
  trail: { id: string; name: string }[];
  /** Units with units under them, which can be opened. */
  parents: string[];
};

/** Everything the Totals screen and its export need, for one scenario and grouping. */
export async function loadTotals(workspaceId: string, query: TotalsQuery): Promise<TotalsView> {
  const [all, fields, settings, hierarchy] = await Promise.all([
    listScenarios(workspaceId),
    listFieldChoices(workspaceId),
    getPlanningSettings(workspaceId),
    listHierarchy(workspaceId),
  ]);
  const scenarios = all.filter((s) => !s.archived);
  const scenario =
    scenarios.find((s) => s.id === query.scenarioId) ??
    scenarios.find((s) => s.isLive) ??
    scenarios[0] ??
    null;
  const empty = { months: [], rows: [] };
  if (!scenario) {
    return {
      scenarios,
      scenario: null,
      fields,
      costSplitFieldId: settings?.costSplitFieldId ?? null,
      scenarioMonths: [],
      query: { ...query, from: "", to: "" },
      table: empty,
      trail: [],
      parents: [],
    };
  }
  const scenarioMonths = monthsBetween(scenario.firstPeriod, scenario.lastPeriod);
  const clamp = (m: string | null, fallback: string) =>
    m && scenarioMonths.includes(m) ? m : fallback;
  const from = clamp(query.from, scenarioMonths[0]!);
  const to = clamp(query.to, scenarioMonths.at(-1)!);
  const range = from <= to ? { from, to } : { from: to, to: from };
  const byField = fields.find((f) => f.id === query.by);

  const totals = await scenarioTotals(
    scenario.id,
    range.from,
    range.to,
    byField ? { fieldId: byField.id } : { unit: query.unitId }
  );

  const units = new Map(hierarchy.units.map((u) => [u.id, u]));
  const trail: { id: string; name: string }[] = [];
  for (
    let u = query.unitId ? units.get(query.unitId) : undefined;
    u;
    u = u.parentId ? units.get(u.parentId) : undefined
  ) {
    trail.unshift({ id: u.id, name: u.name });
  }
  return {
    scenarios,
    scenario,
    fields,
    costSplitFieldId: settings?.costSplitFieldId ?? null,
    scenarioMonths,
    query: { ...query, by: byField ? byField.id : "unit", ...range },
    table: pivotTotals(totals, monthsBetween(range.from, range.to), query.measure),
    trail,
    parents: [...new Set(hierarchy.units.filter((u) => u.parentId).map((u) => u.parentId!))],
  };
}
