"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Unread notifications in the user's other workspaces, by workspace id, for the switcher. Live:
 * new ones are counted as they arrive; marking them read happens in their own workspace.
 */
export function useUnreadElsewhere(): Map<string, number> {
  const { user, workspace, workspaces } = useWorkspace();
  const othersKey = workspaces
    .filter((w) => w.id !== workspace.id)
    .map((w) => w.id)
    .join(",");
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const others = othersKey.split(",").filter(Boolean);
    if (others.length === 0) return;
    const supabase = getBrowserClient();
    let active = true;
    const add = (id: string) =>
      setCounts((current) => new Map(current).set(id, (current.get(id) ?? 0) + 1));

    supabase
      .from("notifications")
      .select("workspace_id")
      .is("read_at", null)
      .in("workspace_id", others)
      .limit(1000)
      .then(({ data }) => {
        if (!active) return;
        const next = new Map<string, number>();
        for (const row of data ?? []) {
          if (row.workspace_id) next.set(row.workspace_id, (next.get(row.workspace_id) ?? 0) + 1);
        }
        setCounts(next);
      });

    const channel = supabase
      .channel(`notifications-elsewhere:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (change) => {
          const id = (change.new as { workspace_id: string | null }).workspace_id;
          if (id && others.includes(id)) add(id);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user.id, othersKey]);

  return counts;
}
