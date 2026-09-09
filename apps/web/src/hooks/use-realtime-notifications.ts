"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime for the Notification table.
 *
 * When any new notification is inserted, it invalidates the React Query
 * cache so the notification list and unread count refresh.
 * Also shows a toast for immediate feedback.
 *
 * Note: Requires the Notification table to be in the Supabase Realtime publication:
 *   ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
 *
 * Run this SQL in the Supabase SQL editor to enable Realtime on the table.
 */
export function useRealtimeNotifications(companyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
        },
        (payload) => {
          // Refresh notification queries — bell badge will update
          queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);
}
