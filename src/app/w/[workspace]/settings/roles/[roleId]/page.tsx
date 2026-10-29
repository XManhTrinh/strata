import { notFound } from "next/navigation";
import { RoleEditor } from "@/features/roles/components/role-editor";
import { getWorkspaceId, listRoles } from "@/features/roles/queries";
import { createClient } from "@/lib/supabase/server";

export default async function RoleEditorPage({
  params,
}: {
  params: Promise<{ workspace: string; roleId: string }>;
}) {
  const { workspace: slug, roleId } = await params;
  const workspaceId = await getWorkspaceId(slug);
  if (!workspaceId) notFound();

  const role = (await listRoles(workspaceId)).find((r) => r.id === roleId);
  if (!role) notFound();

  const supabase = await createClient();
  const [{ data: features }, { data: enabled }, { data: permissions }, { data: grants }] =
    await Promise.all([
      supabase.from("features").select("key, is_core").order("sort_order"),
      supabase
        .from("workspace_features")
        .select("feature_key")
        .eq("workspace_id", workspaceId)
        .eq("enabled", true),
      supabase.from("permissions").select("key, feature_key, is_scoped").order("sort_order"),
      supabase.from("role_permissions").select("permission_key, reach").eq("role_id", roleId),
    ]);

  const on = new Set((enabled ?? []).map((f) => f.feature_key));
  return (
    <RoleEditor
      role={role}
      features={(features ?? []).map((f) => ({ key: f.key, on: f.is_core || on.has(f.key) }))}
      permissions={(permissions ?? []).map((p) => ({
        key: p.key,
        featureKey: p.feature_key,
        isScoped: p.is_scoped,
      }))}
      grants={Object.fromEntries((grants ?? []).map((g) => [g.permission_key, g.reach]))}
    />
  );
}
