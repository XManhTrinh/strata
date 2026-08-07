import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Employee } from "./employees.service";
import type { Squad } from "./engineering.service";

export interface CapacityAllocation {
  id: string;
  employeeId: string;
  squadId: string;
  percentage: number;
  employee?: Employee;
  squad?: Squad;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityOverview {
  employeeId: string;
  allocations: CapacityAllocation[];
  totalPercentage: number;
}

export interface CapacityAllocationsParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  squadId?: string;
}

export interface UpdateCapacityAllocationRequest {
  id: string;
  percentage: number;
}

export function useCapacityAllocations(params?: CapacityAllocationsParams) {
  return useQuery({
    queryKey: ["capacity-allocations", params],
    queryFn: () =>
      apiClient<CapacityAllocation[]>("/capacity/allocations", {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          employeeId: params?.employeeId,
          squadId: params?.squadId,
        },
      }),
  });
}

export function useCapacityOverview(employeeId: string) {
  return useQuery({
    queryKey: ["capacity-overview", employeeId],
    queryFn: () =>
      apiClient<CapacityOverview>(`/capacity/overview/${employeeId}`),
    enabled: !!employeeId,
  });
}

export function useUpdateCapacityAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCapacityAllocationRequest) =>
      apiClient<CapacityAllocation>(`/capacity/allocations/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capacity-allocations"] });
    },
  });
}
