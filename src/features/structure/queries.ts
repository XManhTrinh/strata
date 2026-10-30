import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildTree } from "./hierarchy";
import type { OrgUnitNode } from "./types";
import type {
  CareerLevel,
  CustomField,
  EmploymentType,
  OrgLevel,
  OrgUnit,
  Position,
} from "./types";

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

/** Career levels (by track, junior first), positions and employment types, archived included. */
export async function listJobs(workspaceId: string): Promise<{
  careerLevels: CareerLevel[];
  positions: Position[];
  employmentTypes: EmploymentType[];
}> {
  const supabase = await createClient();
  const [{ data: levels }, { data: positions }, { data: types }] = await Promise.all([
    supabase
      .from("career_levels")
      .select("id, name, rank, track, archived_at")
      .eq("workspace_id", workspaceId)
      .order("track", { nullsFirst: true })
      .order("rank"),
    supabase
      .from("positions")
      .select("id, name, description, min_level_id, max_level_id, archived_at")
      .eq("workspace_id", workspaceId)
      .order("name"),
    supabase
      .from("employment_types")
      .select("id, name, cost_method, archived_at")
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("name"),
  ]);
  return {
    careerLevels: (levels ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      rank: l.rank,
      track: l.track,
      archived: l.archived_at !== null,
    })),
    positions: (positions ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      minLevelId: p.min_level_id,
      maxLevelId: p.max_level_id,
      archived: p.archived_at !== null,
    })),
    employmentTypes: (types ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      costMethod: e.cost_method,
      archived: e.archived_at !== null,
    })),
  };
}

/** Custom fields in order with their options, archived included. */
export async function listCustomFields(workspaceId: string): Promise<CustomField[]> {
  const supabase = await createClient();
  const [{ data: fields }, { data: options }] = await Promise.all([
    supabase
      .from("custom_fields")
      .select("id, key, label, type, sensitive, required, keep_history, archived_at")
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("label"),
    supabase
      .from("custom_field_options")
      .select("id, field_id, label, archived_at")
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("label"),
  ]);
  return (fields ?? []).map((f) => ({
    id: f.id,
    key: f.key,
    name: f.label,
    type: f.type,
    sensitive: f.sensitive,
    required: f.required,
    keepHistory: f.keep_history,
    archived: f.archived_at !== null,
    options: (options ?? [])
      .filter((o) => o.field_id === f.id)
      .map((o) => ({ id: o.id, name: o.label, archived: o.archived_at !== null })),
  }));
}

/** Active units as choices, root first, each labelled with its path ("Acme › Engineering"). */
export async function unitChoices(workspaceId: string): Promise<{ id: string; label: string }[]> {
  const { units } = await listHierarchy(workspaceId);
  const choices: { id: string; label: string }[] = [];
  const walk = (nodes: OrgUnitNode[], path: string[]) => {
    for (const node of nodes) {
      const names = [...path, node.name];
      choices.push({ id: node.id, label: names.join(" › ") });
      walk(node.children, names);
    }
  };
  walk(buildTree(units, false), []);
  return choices;
}
