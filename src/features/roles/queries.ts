import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleSummary = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  archived: boolean;
};

export async function listRoles(workspaceId: string): Promise<RoleSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("id, name, description, system_key, archived_at")
    .eq("workspace_id", workspaceId)
    .order("name");
  return (data ?? [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.system_key !== null,
      archived: r.archived_at !== null,
    }))
    .sort(
      (a, b) => Number(b.isSystem) - Number(a.isSystem) || Number(a.archived) - Number(b.archived)
    );
}
