import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "./people.service";

export interface Budget {
  id: string;
  departmentId: string;
  fiscalPeriod: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetsParams {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  fiscalPeriod?: string;
}

export interface CreateBudgetRequest {
  departmentId: string;
  fiscalPeriod: string;
  amount: number;
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
}

export function useBudgets(params?: BudgetsParams) {
  return useQuery({
    queryKey: ["budgets", params],
    queryFn: () =>
      apiClient<PaginatedResponse<Budget>>("/budgets", {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          departmentId: params?.departmentId,
          fiscalPeriod: params?.fiscalPeriod,
        },
      }),
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: ["budgets", id],
    queryFn: () => apiClient<Budget>(`/budgets/${id}`),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) =>
      apiClient<Budget>("/budgets", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateBudgetRequest) =>
      apiClient<Budget>(`/budgets/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/budgets/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
