import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import {
  type WorkspaceContextValue,
  WorkspaceProvider,
} from "@/features/workspaces/workspace-context";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

/** Loads the workspace, the user's permissions and their other workspaces once per request. */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect(`/sign-in?next=/w/${slug}`);
  const userId = auth.claims.sub;

  // RLS returns only workspaces the user is an active member of; anything else is "not found",
  // so the page never reveals whether a workspace exists.
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, slug, name")
    .order("name");
  const workspace = workspaces?.find((w) => w.slug === slug);
  if (!workspace) notFound();

  const [{ data: permissions }, { data: profile }] = await Promise.all([
    supabase.rpc("my_permissions", { p_workspace_id: workspace.id }),
    supabase
      .from("profiles")
      .select("full_name, last_workspace_id, avatar_path")
      .eq("id", userId)
      .single(),
  ]);

  if (profile && profile.last_workspace_id !== workspace.id) {
    await supabase.from("profiles").update({ last_workspace_id: workspace.id }).eq("id", userId);
  }

  const avatarUrls = await signedAvatarUrls(supabase, [profile?.avatar_path]);
  const email = typeof auth.claims.email === "string" ? auth.claims.email : "";
  const value: WorkspaceContextValue = {
    workspace,
    workspaces: workspaces ?? [],
    permissions: Object.fromEntries((permissions ?? []).map((p) => [p.permission_key, p.reaches])),
    user: {
      id: userId,
      fullName: profile?.full_name || email,
      email,
      avatarUrl: (profile?.avatar_path && avatarUrls.get(profile.avatar_path)) || null,
    },
  };

  return (
    <WorkspaceProvider value={value}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
