import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse, Person } from "./people.service";

export interface Employee {
  id: string;
  uin: string;
  personId: string;
  organizationId: string;
  departmentId: string | null;
  positionId: string | null;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "SUSPENDED";
  person?: Person;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  uin: string;
  personId: string;
  organizationId: string;
  departmentId?: string | null;
  positionId?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: Employee["status"];
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  id: string;
}

export interface EmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: Employee["status"];
  departmentId?: string;
}

export function useEmployees(params?: EmployeesParams) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () =>
      apiClient<PaginatedResponse<Employee>>("/employees", {
        params: {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          status: params?.status,
          departmentId: params?.departmentId,
        },
      }),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => apiClient<Employee>(`/employees/${id}`),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) =>
      apiClient<Employee>("/employees", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateEmployeeRequest) =>
      apiClient<Employee>(`/employees/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/employees/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
