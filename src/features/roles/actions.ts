"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Reach = Database["public"]["Enums"]["reach"];
type Result = { ok: true } | { ok: false; error: ErrorKey };

const roleSchema = z.object({
  name: z.string().trim().min(1, { error: "roleNameRequired" }).max(60),
  description: z.string().trim().max(300).default(""),
});

function errorKey(error: { code?: string }): ErrorKey {
  if (error.code === "42501") return "notAllowed";
  if (error.code === "23505") return "roleNameTaken";
  return "generic";
}

function revalidateRoles() {
  revalidatePath("/w/[workspace]/settings/roles", "layout");
}

/** Creates a role, optionally copying another role's permissions, then opens it. */
export async function createRole(
  workspaceId: string,
  slug: string,
  copyFromRoleId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .insert({ workspace_id: workspaceId, ...parsed.data })
    .select("id")
    .single();
  if (error || !role)
    return { status: "error", fieldErrors: { name: error ? errorKey(error) : "generic" } };

  if (copyFromRoleId) {
    const { data: source } = await supabase
      .from("role_permissions")
      .select("permission_key, reach")
      .eq("role_id", copyFromRoleId);
    if (source?.length) {
      const { error: copyError } = await supabase
        .from("role_permissions")
        .insert(source.map((p) => ({ workspace_id: workspaceId, role_id: role.id, ...p })));
      if (copyError) return { status: "error", error: errorKey(copyError) };
    }
  }

  revalidateRoles();
  redirect(`/w/${slug}/settings/roles/${role.id}`);
}

export async function updateRoleDetails(
  roleId: string,
  name: string,
  description: string
): Promise<Result> {
  const parsed = roleSchema.safeParse({ name, description });
  if (!parsed.success) return { ok: false, error: "roleNameRequired" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .update(parsed.data)
    .eq("id", roleId)
    .select("id");
  revalidateRoles();
  if (error) return { ok: false, error: errorKey(error) };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}

/** Sets a permission's reach on a role, or removes it (null). The database refuses escalation. */
export async function setRolePermission(
  workspaceId: string,
  roleId: string,
  permissionKey: string,
  reach: Reach | null
): Promise<Result> {
  const supabase = await createClient();
  const { error } =
    reach === null
      ? await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_key", permissionKey)
      : await supabase
          .from("role_permissions")
          .upsert(
            { workspace_id: workspaceId, role_id: roleId, permission_key: permissionKey, reach },
            { onConflict: "role_id,permission_key" }
          );
  revalidateRoles();
  return error ? { ok: false, error: errorKey(error) } : { ok: true };
}

export async function setRoleArchived(roleId: string, archived: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", roleId)
    .select("id");
  revalidateRoles();
  if (error) return { ok: false, error: errorKey(error) };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}
