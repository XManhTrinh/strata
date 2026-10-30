"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { fillRoleSchema, plannedRoleSchema } from "./schemas";
import type { AllocationChange, AllocationRow } from "./types";

type Result = { ok: true } | { ok: false; error: ErrorKey };

const PAGE = 500;

/** A page of the grid: rows per person or planned role and team. */
export async function loadGrid(
  scenarioId: string,
  from: string,
  to: string,
  unitId: string | null,
  search: string,
  offset: number
): Promise<{ rows: AllocationRow[]; total: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("allocation_grid", {
    p_scenario_id: scenarioId,
    p_from: from,
    p_to: to,
    p_unit_id: unitId ?? undefined,
    p_search: search,
    p_limit: PAGE,
    p_offset: offset,
  });
  const rows = (data ?? []).map((r) => ({
    key: `${r.member_id ?? r.planned_role_id}:${r.org_unit_id}`,
    memberId: r.member_id,
    plannedRoleId: r.planned_role_id,
    name: r.name,
    unitId: r.org_unit_id,
    unitName: r.unit_name,
    filledOn: r.filled_on,
    months: r.months as Record<string, number>,
    totals: r.totals as Record<string, number>,
  }));
  return { rows, total: Number(data?.[0]?.total_count ?? 0) };
}

/** Saves grid changes; reports how many months someone is over full time. */
export async function saveAllocations(
  scenarioId: string,
  changes: AllocationChange[]
): Promise<{ ok: true; over: number } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_allocations", {
    p_scenario_id: scenarioId,
    p_changes: changes.map((c) => ({
      member_id: c.memberId,
      planned_role_id: c.plannedRoleId,
      org_unit_id: c.unitId,
      period: c.period,
      fte: c.fte,
    })),
  });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidatePath("/w/[workspace]/planning", "layout");
  const over = (data as { over?: unknown[] } | null)?.over;
  return { ok: true, over: Array.isArray(over) ? over.length : 0 };
}

export async function savePlannedRole(
  workspaceId: string,
  scenarioId: string,
  roleId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = plannedRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const r = parsed.data;
  const values = {
    title: r.name,
    org_unit_id: r.unitId,
    position_id: r.positionId,
    career_level_id: r.careerLevelId,
    employment_type_id: r.employmentTypeId,
    start_date: r.startDate,
    end_date: r.endDate,
    fte: r.fte,
  };
  const supabase = await createClient();
  const { data, error } = roleId
    ? await supabase.from("planned_roles").update(values).eq("id", roleId).select("id")
    : await supabase
        .from("planned_roles")
        .insert({ workspace_id: workspaceId, scenario_id: scenarioId, ...values })
        .select("id");
  if (error) return { status: "error", error: errorKey(error, "generic") };
  if (!data?.length) return { status: "error", error: "notAllowed" };
  revalidatePath("/w/[workspace]/planning", "layout");
  return { status: "success" };
}

export async function fillPlannedRole(
  roleId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = fillRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("fill_planned_role", {
    p_planned_role_id: roleId,
    p_member_id: parsed.data.memberId,
    p_from: parsed.data.from,
  });
  if (error) return { status: "error", error: errorKey(error, "generic") };
  revalidatePath("/w/[workspace]/planning", "layout");
  return { status: "success" };
}

export async function deletePlannedRole(roleId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_roles")
    .delete()
    .eq("id", roleId)
    .select("id");
  if (error) return { ok: false, error: errorKey(error, "generic") };
  if (!data?.length) return { ok: false, error: "notAllowed" };
  revalidatePath("/w/[workspace]/planning", "layout");
  return { ok: true };
}
