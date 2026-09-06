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
  members: MemberAllocation[];
  totals: PeriodValues;
  fteTotals: PeriodValues;
  permCount: number;
  subConCount: number;
}

export interface RateCard {
  id: string;
  companyId: string;
  division: string;
  location: string;
  grade: string;
  annualCost: number;
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

export function useRateCards(companyId: string) {
  return useQuery({
    queryKey: ["rate-cards", companyId],
    queryFn: () => apiClient<RateCard[]>(`/companies/${companyId}/capacity/rate-cards`),
    enabled: !!companyId,
  });
}

export function useUpsertRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...card }: { companyId: string; division: string; location: string; grade: string; annualCost: number }) =>
      apiClient(`/companies/${companyId}/capacity/rate-cards`, {
        method: "POST",
        body: card,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
      queryClient.invalidateQueries({ queryKey: ["capacity-summary"] });
    },
  });
}

export function useBulkUpsertRateCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, cards }: { companyId: string; cards: Array<{ division: string; location: string; grade: string; annualCost: number }> }) =>
      apiClient(`/companies/${companyId}/capacity/rate-cards/bulk`, {
        method: "PUT",
        body: { cards },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
      queryClient.invalidateQueries({ queryKey: ["capacity-summary"] });
    },
  });
}

export function useDeleteRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient(`/companies/${companyId}/capacity/rate-cards/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
      queryClient.invalidateQueries({ queryKey: ["capacity-summary"] });
    },
  });
}
