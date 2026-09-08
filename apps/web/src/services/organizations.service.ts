import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface OrganizationUnitType {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUnit {
  id: string;
  companyId: string;
  typeId: string;
  parentId: string | null;
  name: string;
  path: string;
  type?: OrganizationUnitType;
  children?: OrganizationUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgUnitRequest {
  companyId: string;
  typeId: string;
  parentId?: string | null;
  name: string;
}

export interface UpdateOrgUnitRequest extends Partial<Omit<CreateOrgUnitRequest, "companyId">> {
  companyId: string;
  id: string;
}

export function useOrgUnits(companyId: string) {
  return useQuery({
    queryKey: ["org-units", companyId],
    queryFn: () =>
      apiClient<OrganizationUnit[]>(
        `/companies/${companyId}/org-units`
      ),
    enabled: !!companyId,
  });
}

export function useOrgUnit(companyId: string, id: string) {
  return useQuery({
    queryKey: ["org-units", companyId, id],
    queryFn: () =>
      apiClient<OrganizationUnit>(
        `/companies/${companyId}/org-units/${id}`
      ),
    enabled: !!companyId && !!id,
  });
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrgUnitRequest) =>
      apiClient<OrganizationUnit>(
        `/companies/${data.companyId}/org-units`,
        {
          method: "POST",
          body: data,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-units"] });
    },
  });
}

export function useUpdateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...data }: UpdateOrgUnitRequest) =>
      apiClient<OrganizationUnit>(
        `/companies/${companyId}/org-units/${id}`,
        {
          method: "PUT",
          body: data,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-units"] });
    },
  });
}

export function useDeleteOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<void>(
        `/companies/${companyId}/org-units/${id}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-units"] });
    },
  });
}

/**
 * Fetches the org unit hierarchy as a pre-built tree from the API.
 * Each node includes nested `children`.
 */
export function useOrgUnitTree(companyId: string) {
  return useQuery({
    queryKey: ["org-units", companyId, "tree"],
    queryFn: () =>
      apiClient<OrganizationUnit[]>(
        `/companies/${companyId}/org-units/tree`,
      ),
    enabled: !!companyId,
  });
}
