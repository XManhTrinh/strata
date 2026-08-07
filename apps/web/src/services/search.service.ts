import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SearchFilters {
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export function useSearch(query: string, filters?: SearchFilters) {
  return useQuery({
    queryKey: ["search", query, filters],
    queryFn: () =>
      apiClient<SearchResponse>("/search", {
        params: {
          query,
          type: filters?.type,
          page: filters?.page,
          pageSize: filters?.pageSize,
        },
      }),
    enabled: !!query,
  });
}
