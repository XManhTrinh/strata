import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "./people.service";

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLog(params?: AuditLogParams) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () =>
      apiClient<PaginatedResponse<AuditRecord>>("/audit", {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          entityType: params?.entityType,
          entityId: params?.entityId,
          action: params?.action,
          userId: params?.userId,
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
      }),
  });
}
