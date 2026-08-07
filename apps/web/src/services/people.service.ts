import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Shared pagination response type
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Person {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth: string;
}

export interface UpdatePersonRequest extends Partial<CreatePersonRequest> {
  id: string;
}

export interface PeopleParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function usePeople(params?: PeopleParams) {
  return useQuery({
    queryKey: ["people", params],
    queryFn: () =>
      apiClient<PaginatedResponse<Person>>("/people", {
        params: {
          page: params?.page,
          pageSize: params?.pageSize,
          search: params?.search,
        },
      }),
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: ["people", id],
    queryFn: () => apiClient<Person>(`/people/${id}`),
    enabled: !!id,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonRequest) =>
      apiClient<Person>("/people", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdatePersonRequest) =>
      apiClient<Person>(`/people/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/people/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}
