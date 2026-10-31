import "server-only";
import { signedAvatarUrls, signedLogoUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceContextValue } from "./workspace-context";

/**
 * The workspace frame for the signed-in user: the workspace (by its address, or else the one they
 * used last, or else their first), their permissions there and their other workspaces. Null when
 * they aren't in that workspace, or in none. Opening a workspace by address remembers it.
 */
export async function loadWorkspaceContext(
  userId: string,
  email: string,
  slug: string | null
): Promise<WorkspaceContextValue | null> {
  const supabase = await createClient();
  // RLS returns only workspaces the user is an active member of.
  const [{ data: workspaces }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("id, slug, name, logo_path").order("name"),
    supabase
      .from("profiles")
      .select("full_name, last_workspace_id, avatar_path")
      .eq("id", userId)
      .single(),
  ]);
  const logos = await signedLogoUrls(
    supabase,
    (workspaces ?? []).map((w) => w.logo_path)
  );
  const summaries = (workspaces ?? []).map((w) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    logoUrl: (w.logo_path && logos.get(w.logo_path)) || null,
  }));
  const workspace = slug
    ? summaries.find((w) => w.slug === slug)
    : (summaries.find((w) => w.id === profile?.last_workspace_id) ?? summaries[0]);
  if (!workspace) return null;

  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  if (slug && profile && profile.last_workspace_id !== workspace.id) {
    await supabase.from("profiles").update({ last_workspace_id: workspace.id }).eq("id", userId);
  }

  const avatarUrls = await signedAvatarUrls(supabase, [profile?.avatar_path]);
  return {
    workspace,
    workspaces: summaries,
    permissions: Object.fromEntries((permissions ?? []).map((p) => [p.permission_key, p.reaches])),
    user: {
      id: userId,
      fullName: profile?.full_name || email,
      email,
      avatarUrl: (profile?.avatar_path && avatarUrls.get(profile.avatar_path)) || null,
    },
  };
}
