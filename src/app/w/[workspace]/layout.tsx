import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { loadWorkspaceContext } from "@/features/workspaces/load-context";
import { WorkspaceProvider } from "@/features/workspaces/workspace-context";
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

  // Anything the user isn't in is "not found", so the page never reveals whether it exists.
  const email = typeof auth.claims.email === "string" ? auth.claims.email : "";
  const value = await loadWorkspaceContext(auth.claims.sub, email, slug);
  if (!value) notFound();

  return (
    <WorkspaceProvider value={value}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
