import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type ReportType = "headcount" | "capacity" | "budget" | "leave";
export type ReportStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportRecord {
  id: string;
  type: ReportType;
  status: ReportStatus;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  filters?: Record<string, unknown>;
  data?: unknown;
  error?: string;
}

export interface CreateReportDto {
  type: ReportType;
  filters?: Record<string, unknown>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useReports(filters?: { status?: ReportStatus; type?: ReportType }) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () =>
      apiClient<ReportRecord[]>("/reports", {
        params: filters as Record<string, string | undefined>,
      }),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportDto) =>
      apiClient<ReportRecord>("/reports", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
