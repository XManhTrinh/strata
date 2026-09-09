"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: string;
          };

          // Refresh notification queries
          queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });

          // Show toast
          if (notification.type === "import_complete") {
            toast.success(notification.title, {
              description: notification.message,
              duration: 6000,
            });
          } else if (notification.type === "import_error") {
            toast.error(notification.title, {
              description: notification.message,
              duration: 8000,
            });
          } else {
            toast(notification.title, {
              description: notification.message,
              duration: 5000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);
}
