"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type Result = { ok: true } | { ok: false; error: ErrorKey };

const tableKey = z.string().regex(/^[a-z][a-z0-9_]{0,59}$/);
const viewForm = z.object({
  name: z.string().trim().min(1, { error: "viewNameRequired" }).max(80),
  shared: z.enum(["true", "false"]).default("false"),
  isDefault: z.enum(["true", "false"]).default("false"),
});

function failure(error: { code?: string }): ErrorKey {
  if (error.code === "42501") return "notAllowed";
  if (error.code === "23505") return "viewNameTaken";
  return "generic";
}

/** Clears the other default among the same owner's (or the shared) views of a table. */
async function clearDefault(workspaceId: string, key: string, shared: boolean, userId: string) {
  const supabase = await createClient();
  const query = supabase
    .from("table_views")
    .update({ is_default: false })
    .eq("workspace_id", workspaceId)
    .eq("table_key", key)
    .eq("is_default", true);
  await (shared ? query.is("user_id", null) : query.eq("user_id", userId));
}

/**
 * Saves the current table state as a new view, then opens it: `returnTo` is the page's path and
 * query, to which the new view's id is added.
 */
export async function saveTableView(
  workspaceId: string,
  key: string,
  state: unknown,
  returnTo: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = viewForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: { name: "viewNameRequired" } };
  const shared = parsed.data.shared === "true";
  const isDefault = parsed.data.isDefault === "true";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { status: "error", error: "notAllowed" };
  if (isDefault) await clearDefault(workspaceId, tableKey.parse(key), shared, userId);

  const { data, error } = await supabase
    .from("table_views")
    .insert({
      workspace_id: workspaceId,
      user_id: shared ? null : userId,
      table_key: tableKey.parse(key),
      name: parsed.data.name,
      state: state as NonNullable<Json>,
      is_default: isDefault,
    })
    .select("id")
    .single();
  if (error || !data) {
    const message = error ? failure(error) : "generic";
    return message === "viewNameTaken"
      ? { status: "error", fieldErrors: { name: message } }
      : { status: "error", error: message };
  }
  const path = z.string().startsWith("/").parse(returnTo);
  redirect(`${path}${path.includes("?") ? "&" : "?"}view=${data.id}`);
}

/** Replaces a view's saved state with the current one. */
export async function updateTableView(viewId: string, state: unknown): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("table_views")
    .update({ state: state as NonNullable<Json> })
    .eq("id", z.uuid().parse(viewId))
    .select("id");
  revalidatePath("/w/[workspace]", "layout");
  if (error) return { ok: false, error: failure(error) };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}

/** Makes a view the default for its owner (or for everyone, if shared), or stops it being one. */
export async function setDefaultTableView(viewId: string, isDefault: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data: view } = await supabase
    .from("table_views")
    .select("workspace_id, table_key, user_id")
    .eq("id", z.uuid().parse(viewId))
    .single();
  const { data: auth } = await supabase.auth.getClaims();
  if (!view || !auth?.claims.sub) return { ok: false, error: "notAllowed" };
  if (isDefault) {
    await clearDefault(view.workspace_id, view.table_key, view.user_id === null, auth.claims.sub);
  }
  const { data, error } = await supabase
    .from("table_views")
    .update({ is_default: isDefault })
    .eq("id", viewId)
    .select("id");
  revalidatePath("/w/[workspace]", "layout");
  if (error) return { ok: false, error: failure(error) };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}

export async function deleteTableView(viewId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("table_views")
    .delete()
    .eq("id", z.uuid().parse(viewId))
    .select("id");
  revalidatePath("/w/[workspace]", "layout");
  if (error) return { ok: false, error: failure(error) };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}
