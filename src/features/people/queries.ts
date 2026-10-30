import "server-only";
import { buildTree } from "@/features/structure/hierarchy";
import type { OrgUnitNode } from "@/features/structure/types";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import type { DirectoryParams } from "./directory-params";
import type {
  DirectoryFilterOptions,
  DirectoryPerson,
  FieldValue,
  JobChoices,
  PersonProfile,
} from "./types";

/** One page of the people the caller may see; the database applies reach, filters and sort. */
export async function peopleDirectory(
  workspaceId: string,
  params: DirectoryParams
): Promise<{ people: DirectoryPerson[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("people_directory", {
    p_workspace_id: workspaceId,
    p_search: params.search,
    p_unit_id: params.unitId ?? undefined,
    p_position_id: params.positionId ?? undefined,
    p_employment_type_id: params.employmentTypeId ?? undefined,
    p_status: params.status,
    p_sort: params.sort,
    p_descending: params.descending,
    p_limit: params.size,
    p_offset: params.page * params.size,
  });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const avatars = await signedAvatarUrls(
    supabase,
    rows.map((r) => r.avatar_path)
  );
  return {
    total: Number(rows[0]?.total_count ?? 0),
    people: rows.map((r) => ({
      id: r.member_id,
      fullName: r.full_name,
      email: r.email,
      personKey: r.person_key,
      avatarUrl: (r.avatar_path && avatars.get(r.avatar_path)) || null,
      unitName: r.unit_name,
      positionName: r.position_name,
      careerLevelName: r.career_level_name,
      employmentTypeName: r.employment_type_name,
      managerName: r.manager_name,
      startDate: r.start_date,
      endDate: r.end_date,
    })),
  };
}

/** Units (indented by depth, root first), positions and employment types for the filters. */
async function directoryFilterOptions(workspaceId: string): Promise<DirectoryFilterOptions> {
  const supabase = await createClient();
  const [{ data: units }, { data: positions }, { data: types }] = await Promise.all([
    supabase
      .from("org_units")
      .select("id, parent_id, level_id, name, code, archived_at")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("positions")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("employment_types")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("sort_order"),
  ]);

  const flat: DirectoryFilterOptions["units"] = [];
  const walk = (nodes: OrgUnitNode[], depth: number) => {
    for (const node of nodes) {
      flat.push({ id: node.id, label: `${" ".repeat(depth)}${node.name}` });
      walk(node.children, depth + 1);
    }
  };
  walk(
    buildTree(
      (units ?? []).map((u) => ({
        id: u.id,
        parentId: u.parent_id,
        levelId: u.level_id,
        name: u.name,
        code: u.code,
        archived: false,
      })),
      false
    ),
    0
  );

  return {
    units: flat,
    positions: (positions ?? []).map((p) => ({ id: p.id, label: p.name })),
    employmentTypes: (types ?? []).map((t) => ({ id: t.id, label: t.name })),
  };
}

/** Everything the profile shows, as far as the caller may see it; null when they can't see them. */
export async function personProfile(
  workspaceId: string,
  memberId: string
): Promise<PersonProfile | null> {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, person_key, start_date, end_date, user_id")
    .eq("workspace_id", workspaceId)
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return null;

  const today = new Date().toISOString().slice(0, 10);
  const [jobs, pay, fields, options, values, access, workspace, profile] = await Promise.all([
    supabase
      .from("member_assignments")
      .select(
        "id, valid_from, valid_to, org_unit_id, manager_member_id, position_id, career_level_id, employment_type_id, org_units(name), manager:members!member_assignments_workspace_id_manager_member_id_fkey(full_name), positions(name), career_levels(name), employment_types(name)"
      )
      .eq("member_id", memberId)
      .order("valid_from", { ascending: false }),
    supabase
      .from("member_compensation")
      .select("id, valid_from, valid_to, annual_salary, day_rate, currency")
      .eq("member_id", memberId)
      .order("valid_from", { ascending: false }),
    supabase
      .from("custom_fields")
      .select("id, label, type, sensitive, keep_history")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("custom_field_options")
      .select("id, field_id, label, archived_at")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("member_field_values")
      .select("field_id, value")
      .eq("member_id", memberId)
      .lte("valid_from", today)
      .or(`valid_to.is.null,valid_to.gt.${today}`),
    supabase.rpc("my_access_to_member", { p_member_id: memberId }),
    supabase.from("workspaces").select("currency").eq("id", workspaceId).single(),
    member.user_id
      ? supabase.from("profiles").select("avatar_path").eq("id", member.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const accessKeys = (access.data ?? []) as PersonProfile["access"];
  const personFieldIds = new Set(
    (fields.data ?? []).filter((f) => f.type === "person").map((f) => f.id)
  );
  const personIds = (values.data ?? [])
    .filter((v) => personFieldIds.has(v.field_id) && typeof v.value === "string")
    .map((v) => v.value as string);
  const { data: named } = personIds.length
    ? await supabase.from("members").select("id, full_name").in("id", personIds)
    : { data: [] };
  const nameOf = new Map((named ?? []).map((m) => [m.id, m.full_name]));
  const avatars = await signedAvatarUrls(supabase, [profile.data?.avatar_path]);
  const valueByField = new Map((values.data ?? []).map((v) => [v.field_id, v.value]));
  const canSeeSensitive = accessKeys.includes("people.view_compensation");

  return {
    id: member.id,
    workspaceId,
    fullName: member.full_name,
    email: member.email,
    personKey: member.person_key,
    startDate: member.start_date,
    endDate: member.end_date,
    avatarUrl: (profile.data?.avatar_path && avatars.get(profile.data.avatar_path)) || null,
    hasAccount: member.user_id !== null,
    jobs: (jobs.data ?? []).map((j) => ({
      id: j.id,
      validFrom: j.valid_from,
      validTo: j.valid_to,
      unitId: j.org_unit_id,
      unitName: j.org_units?.name ?? "",
      managerId: j.manager_member_id,
      managerName: j.manager?.full_name ?? null,
      positionId: j.position_id,
      positionName: j.positions?.name ?? null,
      careerLevelId: j.career_level_id,
      careerLevelName: j.career_levels?.name ?? null,
      employmentTypeId: j.employment_type_id,
      employmentTypeName: j.employment_types?.name ?? null,
    })),
    pay: canSeeSensitive
      ? (pay.data ?? []).map((p) => ({
          id: p.id,
          validFrom: p.valid_from,
          validTo: p.valid_to,
          annualSalary: p.annual_salary,
          dayRate: p.day_rate,
          currency: p.currency,
        }))
      : null,
    fields: (fields.data ?? [])
      .filter((f) => canSeeSensitive || !f.sensitive)
      .map((f): FieldValue => ({
        fieldId: f.id,
        label: f.label,
        type: f.type,
        sensitive: f.sensitive,
        keepHistory: f.keep_history,
        options: (options.data ?? [])
          .filter((o) => o.field_id === f.id)
          .map((o) => ({ id: o.id, label: o.label, archived: o.archived_at !== null })),
        value: valueByField.get(f.id) ?? null,
      })),
    access: accessKeys,
    currency: workspace.data?.currency ?? "EUR",
  };
}

/** Active units (indented), positions, career levels and employment types for a job change. */
export async function jobChoices(workspaceId: string): Promise<JobChoices> {
  const supabase = await createClient();
  const [filters, { data: levels }] = await Promise.all([
    directoryFilterOptions(workspaceId),
    supabase
      .from("career_levels")
      .select("id, name, track")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("track", { nullsFirst: true })
      .order("rank"),
  ]);
  return {
    units: filters.units,
    positions: filters.positions,
    employmentTypes: filters.employmentTypes,
    careerLevels: (levels ?? []).map((l) => ({
      id: l.id,
      label: l.track ? `${l.track} · ${l.name}` : l.name,
    })),
  };
}
