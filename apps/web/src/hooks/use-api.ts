import {
  useQuery as useReactQuery,
  useMutation as useReactMutation,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { apiClient, type RequestOptions, ApiClientError } from "@/lib/api-client";

/**
 * Generic query hook factory for GET requests.
 */
export function useApiQuery<T>(
  queryKey: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<T, ApiClientError>, "queryKey" | "queryFn"> & {
    params?: RequestOptions["params"];
  }
) {
  const { params, ...queryOptions } = options ?? {};

  return useReactQuery<T, ApiClientError>({
    queryKey,
    queryFn: () => apiClient<T>(endpoint, { params }),
    ...queryOptions,
  });
}

/**
 * Generic mutation hook factory for POST/PUT/PATCH/DELETE requests.
 */
export function useApiMutation<TData, TVariables = unknown>(
  endpoint: string,
  method: RequestOptions["method"] = "POST",
  options?: Omit<UseMutationOptions<TData, ApiClientError, TVariables>, "mutationFn">
) {
  return useReactMutation<TData, ApiClientError, TVariables>({
    mutationFn: (variables) =>
      apiClient<TData>(endpoint, { method, body: variables }),
    ...options,
  });
}
