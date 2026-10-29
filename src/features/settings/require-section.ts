import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type SettingsSectionKey, visibleSections } from "./sections";

/**
 * Resolves the workspace for a settings page and checks the user may open this section; anything
 * else is "not found", so the page never reveals what exists. The database enforces writes anyway.
 */
export async function requireSettingsSection(
  slug: string,
  section: SettingsSectionKey
): Promise<string> {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  const held = Object.fromEntries((permissions ?? []).map((p) => [p.permission_key, p.reaches]));
  if (!visibleSections(held).some((s) => s.key === section)) notFound();

  return workspace.id;
}
