import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlannedRole, Scenario, TotalsRow } from "./types";

/** The workspace's scenarios, live first, then by name; archived ones last. */
export async function listScenarios(workspaceId: string): Promise<Scenario[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scenarios")
    .select(
      "id, name, first_period, last_period, status, is_live, archived_at, costs_applied_at, baseline_id, locked_through"
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
      lockedThrough: s.locked_through,
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

/** A scenario's planned roles, within the caller's reach. */
export async function listPlannedRoles(scenarioId: string): Promise<PlannedRole[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("planned_roles")
    .select(
      "id, title, org_unit_id, position_id, career_level_id, employment_type_id, start_date, end_date, fte, filled_on"
    )
    .eq("scenario_id", scenarioId)
    .order("title");
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    unitId: r.org_unit_id,
    positionId: r.position_id,
    careerLevelId: r.career_level_id,
    employmentTypeId: r.employment_type_id,
    startDate: r.start_date,
    endDate: r.end_date,
    fte: Number(r.fte),
    filledOn: r.filled_on,
  }));
}
