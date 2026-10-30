import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Scenario, TotalsRow } from "./types";

/** The workspace's scenarios, live first, then by name; archived ones last. */
export async function listScenarios(workspaceId: string): Promise<Scenario[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scenarios")
    .select(
      "id, name, first_period, last_period, status, is_live, archived_at, costs_applied_at, baseline_id"
    )
    .eq("workspace_id", workspaceId)
    .order("is_live", { ascending: false })
    .order("name");
  const names = new Map((data ?? []).map((s) => [s.id, s.name]));
  return (data ?? [])
    .map((s) => ({
      id: s.id,
      name: s.name,
      firstPeriod: s.first_period,
      lastPeriod: s.last_period,
      status: s.status,
      isLive: s.is_live,
      archived: s.archived_at !== null,
      baselineName: (s.baseline_id && names.get(s.baseline_id)) || null,
      costsAppliedAt: s.costs_applied_at,
    }))
    .sort((a, b) => Number(a.archived) - Number(b.archived));
}

/** Totals by unit (each unit under `parentUnitId`, rolled up) or by a custom field. */
export async function scenarioTotals(
  scenarioId: string,
  from: string,
  to: string,
  groupBy: { unit: string | null } | { fieldId: string }
): Promise<TotalsRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("capacity_totals", {
    p_scenario_id: scenarioId,
    p_from: from,
    p_to: to,
    ...("fieldId" in groupBy
      ? { p_group_by: "field", p_field_id: groupBy.fieldId }
      : { p_group_by: "unit", p_parent_unit_id: groupBy.unit ?? undefined }),
  });
  return (data ?? []).map((r) => ({
    groupId: r.group_id,
    groupLabel: r.group_label,
    period: r.period_start,
    fte: Number(r.fte),
    headcount: r.headcount,
    cost: r.cost === null ? null : Number(r.cost),
    currency: r.currency,
  }));
}
