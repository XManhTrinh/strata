import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrgLevel, OrgUnit } from "./types";

/** Every level and unit of the workspace, archived ones included. */
export async function listHierarchy(
  workspaceId: string
): Promise<{ levels: OrgLevel[]; units: OrgUnit[] }> {
  const supabase = await createClient();
  const [{ data: levels }, { data: units }] = await Promise.all([
    supabase
      .from("org_unit_levels")
      .select("id, name, sort_order, archived_at")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("org_units")
      .select("id, parent_id, level_id, name, code, archived_at")
      .eq("workspace_id", workspaceId)
      .order("name"),
  ]);
  return {
    levels: (levels ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      sortOrder: l.sort_order,
      archived: l.archived_at !== null,
    })),
    units: (units ?? []).map((u) => ({
      id: u.id,
      parentId: u.parent_id,
      levelId: u.level_id,
      name: u.name,
      code: u.code,
      archived: u.archived_at !== null,
    })),
  };
}
