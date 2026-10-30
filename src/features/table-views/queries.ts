import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TableView } from "./types";

/** The caller's views and the shared ones for one table, defaults first then by name. */
export async function listTableViews(workspaceId: string, tableKey: string): Promise<TableView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("table_views")
    .select("id, name, user_id, is_default, state")
    .eq("workspace_id", workspaceId)
    .eq("table_key", tableKey)
    .order("name");
  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    shared: v.user_id === null,
    isDefault: v.is_default,
    state: v.state,
  }));
}

/** The view to open when nothing else is asked for: your default, else the shared default. */
export function defaultView(views: TableView[]): TableView | undefined {
  return views.find((v) => v.isDefault && !v.shared) ?? views.find((v) => v.isDefault && v.shared);
}
