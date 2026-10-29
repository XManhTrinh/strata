"use server";

import { revalidatePath } from "next/cache";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { levelSchema, unitSchema } from "./schemas";

type Result = { ok: true } | { ok: false; error: ErrorKey };

/** The database's refusals carry the message key as their hint. */
function errorKey(error: { code?: string; hint?: string | null }, taken: ErrorKey): ErrorKey {
  if (error.hint && error.hint in messages.errors) return error.hint as ErrorKey;
  if (error.code === "42501") return "notAllowed";
  if (error.code === "23505") return taken;
  return "generic";
}

function revalidateHierarchy() {
  revalidatePath("/w/[workspace]/settings/hierarchy", "page");
}

/** Adds a unit (unitId null) or changes one: name, code, level and parent. */
export async function saveUnit(
  workspaceId: string,
  unitId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    code: parsed.data.code,
    parent_id: parsed.data.parentId,
    level_id: parsed.data.levelId,
  };
  const { error } = unitId
    ? await supabase.from("org_units").update(values).eq("id", unitId)
    : await supabase.from("org_units").insert({ workspace_id: workspaceId, ...values });
  if (error) {
    const key = errorKey(error, "unitCodeTaken");
    return key === "unitCodeTaken"
      ? { status: "error", fieldErrors: { code: key } }
      : { status: "error", error: key };
  }

  revalidateHierarchy();
  return { status: "success" };
}

export async function setUnitArchived(unitId: string, archived: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_units")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", unitId);
  revalidateHierarchy();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}

/** Adds a level at the bottom (levelId null) or renames one. */
export async function saveLevel(
  workspaceId: string,
  levelId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = levelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  let error;
  if (levelId) {
    ({ error } = await supabase.from("org_unit_levels").update(parsed.data).eq("id", levelId));
  } else {
    const { data: last } = await supabase
      .from("org_unit_levels")
      .select("sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase.from("org_unit_levels").insert({
      workspace_id: workspaceId,
      name: parsed.data.name,
      sort_order: (last?.sort_order ?? 0) + 10,
    }));
  }
  if (error) {
    const key = errorKey(error, "levelNameTaken");
    return key === "levelNameTaken"
      ? { status: "error", fieldErrors: { name: key } }
      : { status: "error", error: key };
  }

  revalidateHierarchy();
  return { status: "success" };
}

export async function reorderLevels(workspaceId: string, levelIds: string[]): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_org_unit_levels", {
    p_workspace_id: workspaceId,
    p_level_ids: levelIds,
  });
  revalidateHierarchy();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}

export async function setLevelArchived(levelId: string, archived: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_unit_levels")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", levelId);
  revalidateHierarchy();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}
