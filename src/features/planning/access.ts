import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { planningTabs } from "./tabs";

/** The workspace and what the user may do in Planning; "not found" without any of it. */
export async function planningAccess(slug: string) {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, currency")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();
  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  const held = new Set((permissions ?? []).map((p) => p.permission_key));
  const tabs = planningTabs((key) => held.has(key));
  if (tabs.length === 0) notFound();
  return { workspace, held, tabs };
}
