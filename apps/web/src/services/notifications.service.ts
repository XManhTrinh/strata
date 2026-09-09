import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────────

export function useNotifications(companyId: string) {
  return useQuery({
    queryKey: ["notifications", companyId],
    queryFn: () =>
      apiClient<Notification[]>(`/companies/${companyId}/notifications`),
    enabled: !!companyId,
    refetchInterval: 30000, // Poll every 30s as fallback to Realtime
  });
}

export function useUnreadCount(companyId: string) {
  return useQuery({
    queryKey: ["notifications", companyId, "unread-count"],
    queryFn: () =>
      apiClient<{ count: number }>(`/companies/${companyId}/notifications/unread-count`),
    enabled: !!companyId,
    refetchInterval: 15000, // Poll every 15s
  });
}

export function useMarkAsRead(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient(`/companies/${companyId}/notifications/${notificationId}/read`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
    },
  });
}

export function useMarkAllAsRead(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient(`/companies/${companyId}/notifications/read-all`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
    },
  });
}
