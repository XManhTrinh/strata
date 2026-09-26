import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PeriodValues {
  p1: number; p2: number; p3: number; p4: number;
  p5: number; p6: number; p7: number; p8: number;
  p9: number; p10: number; p11: number; p12: number;
}

export interface MemberAllocation {
  membershipId: string;
  fullName: string;
  email: string;
  employmentType: string | null;
  grade: string | null;
  location: string | null;
  division: string | null;
  position: string | null;
  dayRate: number | null;
  annualCost: number | null;
  allocations: PeriodValues;
  monthlyCost: PeriodValues;
}

export interface SquadCapacitySummary {
  orgUnitId: string;
  orgUnitName: string;
  parentName: string | null;
  breadcrumb: string[];
  members: MemberAllocation[];
  totals: PeriodValues;
  fteTotals: PeriodValues;
  permCount: number;
  subConCount: number;
}

export interface UpsertAllocationDto {
  membershipId: string;
  orgUnitId: string;
  fiscalYear: number;
  p1: number; p2: number; p3: number; p4: number;
  p5: number; p6: number; p7: number; p8: number;
  p9: number; p10: number; p11: number; p12: number;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────────

export function useCapacitySummary(companyId: string, fiscalYear: number, orgUnitId?: string) {
  return useQuery({
    queryKey: ["capacity-summary", companyId, fiscalYear, orgUnitId],
    queryFn: () => {
      const params = new URLSearchParams({ fiscalYear: String(fiscalYear) });
      if (orgUnitId) params.set("orgUnitId", orgUnitId);
      return apiClient<SquadCapacitySummary[]>(
        `/companies/${companyId}/capacity/summary?${params}`,
      );
    },
    enabled: !!companyId,
  });
}

export function useSaveAllocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, allocations }: { companyId: string; allocations: UpsertAllocationDto[] }) =>
      apiClient(`/companies/${companyId}/capacity/allocations`, {
        method: "PUT",
        body: { allocations },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-summary"] });
    },
  });
}


