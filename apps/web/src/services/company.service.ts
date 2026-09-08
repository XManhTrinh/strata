import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface CompanySettings {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  stats: {
    members: number;
    roles: number;
    positions: number;
    orgUnits: number;
    orgUnitTypes: number;
  };
}

export function useCompanySettings(companyId: string) {
  return useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => apiClient<CompanySettings>(`/companies/${companyId}/settings`),
    enabled: !!companyId,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...data }: {
      companyId: string;
      name?: string;
      slug?: string;
      settings?: Record<string, unknown>;
    }) =>
      apiClient(`/companies/${companyId}/settings`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-settings", variables.companyId] });
    },
  });
}

export function useResetAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId }: { companyId: string }) =>
      apiClient<{ status: string; preserved: { superAdmins: number } }>(
        `/companies/${companyId}/settings/reset`,
        { method: "POST" },
      ),
    onSuccess: () => {
      // Invalidate everything
      queryClient.invalidateQueries();
    },
  });
}
