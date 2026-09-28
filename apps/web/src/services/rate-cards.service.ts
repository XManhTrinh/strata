import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type RateCardRuleOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "CONTAINS"
  | "IN";

export interface RuleCondition {
  column: string;
  operator: RateCardRuleOperator;
  value: string;
}

export interface RateCardSet {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  color: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RateCardGroup {
  id: string;
  companyId: string;
  setId: string | null;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RateCard {
  id: string;
  companyId: string;
  name: string;
  groupId: string | null;
  priority: number;
  isDefault: boolean;
  conditions: RuleCondition[];
  // Prisma Decimals serialize to string over JSON.
  q1DayRate: string | number | null;
  q1WorkingDays: string | number | null;
  q2DayRate: string | number | null;
  q2WorkingDays: string | number | null;
  q3DayRate: string | number | null;
  q3WorkingDays: string | number | null;
  q4DayRate: string | number | null;
  q4WorkingDays: string | number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertRateCardInput {
  name: string;
  priority: number;
  isDefault: boolean;
  groupId?: string | null;
  conditions: RuleCondition[];
  q1DayRate?: number | null;
  q1WorkingDays?: number | null;
  q2DayRate?: number | null;
  q2WorkingDays?: number | null;
  q3DayRate?: number | null;
  q3WorkingDays?: number | null;
  q4DayRate?: number | null;
  q4WorkingDays?: number | null;
}

export interface ApplyRateCardsResult {
  matched: number;
  unmatched: number;
  total: number;
}

export interface AvailableColumn {
  column: string;
  values: string[];
}

// ─── Query keys ─────────────────────────────────────────────────────────────

const cardsKey = (companyId: string) => ["rate-cards", companyId] as const;
const columnsKey = (companyId: string) => ["rate-card-columns", companyId] as const;
const groupsKey = (companyId: string) => ["rate-card-groups", companyId] as const;
const setsKey = (companyId: string) => ["rate-card-sets", companyId] as const;

// ─── Groups (UI-only organization) ────────────────────────────────────────────

export interface UpsertRateCardGroupInput {
  name: string;
  description?: string;
  color?: string | null;
  setId?: string | null;
}

export interface UpsertRateCardSetInput {
  name: string;
  description?: string;
  color?: string | null;
  displayOrder?: number;
}

export function useRateCardGroups(companyId: string) {
  return useQuery({
    queryKey: groupsKey(companyId),
    queryFn: () => apiClient<RateCardGroup[]>(`/companies/${companyId}/rate-cards/groups`),
    enabled: !!companyId,
  });
}

export function useCreateRateCardGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...input }: { companyId: string } & UpsertRateCardGroupInput) =>
      apiClient<RateCardGroup>(`/companies/${companyId}/rate-cards/groups`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: groupsKey(companyId) });
    },
  });
}

export function useUpdateRateCardGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...input }: { companyId: string; id: string } & UpsertRateCardGroupInput) =>
      apiClient<RateCardGroup>(`/companies/${companyId}/rate-cards/groups/${id}`, {
        method: "PUT",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: groupsKey(companyId) });
    },
  });
}

export function useDeleteRateCardGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient(`/companies/${companyId}/rate-cards/groups/${id}`, { method: "DELETE" }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: groupsKey(companyId) });
      // Deleting a group ungroups its cards.
      queryClient.invalidateQueries({ queryKey: cardsKey(companyId) });
    },
  });
}

// ─── Sets (UI-only tabs, one level above groups) ──────────────────────────────

export function useRateCardSets(companyId: string) {
  return useQuery({
    queryKey: setsKey(companyId),
    queryFn: () => apiClient<RateCardSet[]>(`/companies/${companyId}/rate-cards/sets`),
    enabled: !!companyId,
  });
}

export function useCreateRateCardSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...input }: { companyId: string } & UpsertRateCardSetInput) =>
      apiClient<RateCardSet>(`/companies/${companyId}/rate-cards/sets`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: setsKey(companyId) });
    },
  });
}

export function useUpdateRateCardSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...input }: { companyId: string; id: string } & UpsertRateCardSetInput) =>
      apiClient<RateCardSet>(`/companies/${companyId}/rate-cards/sets/${id}`, {
        method: "PUT",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: setsKey(companyId) });
    },
  });
}

export function useDeleteRateCardSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient(`/companies/${companyId}/rate-cards/sets/${id}`, { method: "DELETE" }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: setsKey(companyId) });
      // Deleting a set un-nests its groups (setId → null).
      queryClient.invalidateQueries({ queryKey: groupsKey(companyId) });
    },
  });
}

// ─── Available columns ──────────────────────────────────────────────────────

export function useAvailableColumns(companyId: string) {
  return useQuery({
    queryKey: columnsKey(companyId),
    queryFn: () =>
      apiClient<AvailableColumn[]>(`/companies/${companyId}/rate-cards/available-columns`),
    enabled: !!companyId,
  });
}

// ─── Rate cards ───────────────────────────────────────────────────────────────

export function useRateCards(companyId: string) {
  return useQuery({
    queryKey: cardsKey(companyId),
    queryFn: () => apiClient<RateCard[]>(`/companies/${companyId}/rate-cards`),
    enabled: !!companyId,
  });
}

export function useCreateRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, ...input }: { companyId: string } & UpsertRateCardInput) =>
      apiClient<RateCard>(`/companies/${companyId}/rate-cards`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: cardsKey(companyId) });
    },
  });
}

export function useUpdateRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...input }: { companyId: string; id: string } & UpsertRateCardInput) =>
      apiClient<RateCard>(`/companies/${companyId}/rate-cards/${id}`, {
        method: "PUT",
        body: input,
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: cardsKey(companyId) });
    },
  });
}

export function useDeleteRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient(`/companies/${companyId}/rate-cards/${id}`, { method: "DELETE" }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: cardsKey(companyId) });
    },
  });
}

export interface SeedDemoResult {
  set: string;
  groups: number;
  cards: number;
}

/** Creates a ready-made "Demo" set of rate cards for quickly populating the UI. */
export function useSeedDemoRateCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId }: { companyId: string }) =>
      apiClient<SeedDemoResult>(`/companies/${companyId}/rate-cards/seed-demo`, {
        method: "POST",
      }),
    onSuccess: (_data, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: setsKey(companyId) });
      queryClient.invalidateQueries({ queryKey: groupsKey(companyId) });
      queryClient.invalidateQueries({ queryKey: cardsKey(companyId) });
    },
  });
}

export function useApplyRateCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, cardIds }: { companyId: string; cardIds: string[] }) =>
      apiClient<ApplyRateCardsResult>(`/companies/${companyId}/rate-cards/apply`, {
        method: "POST",
        body: { cardIds },
      }),
    onSuccess: () => {
      // Applying changes member cost snapshots → capacity summary is stale.
      queryClient.invalidateQueries({ queryKey: ["capacity-summary"] });
    },
  });
}
