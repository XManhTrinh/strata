import "server-only";
import { buildTree } from "@/features/structure/hierarchy";
import type { OrgUnitNode } from "@/features/structure/types";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import type { DirectoryParams } from "./directory-params";
import type { DirectoryFilterOptions, DirectoryPerson } from "./types";

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
export async function directoryFilterOptions(workspaceId: string): Promise<DirectoryFilterOptions> {
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
