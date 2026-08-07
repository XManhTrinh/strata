import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// ─── Constants ────────────────────────────────────────────────────────────────

export const COMPANY_ID = "cm_acme_corp_001";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AdminOrgUnitType {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  displayOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPosition {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  careerLevel: number | null;
  canHaveDirectReports: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRole {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeature {
  id: string;
  key: string;
  displayName: string;
  description: string | null;
  permissions: { id: string; key: string; displayName: string; description: string | null }[];
}

export interface CompanyFeature {
  featureId: string;
  enabled: boolean;
  feature: AdminFeature;
}

// ─── Org Unit Types ───────────────────────────────────────────────────────────

export function useOrgUnitTypes(companyId: string) {
  return useQuery({
    queryKey: ["org-unit-types", companyId],
    queryFn: () =>
      apiClient<AdminOrgUnitType[]>(
        `/api/v2/companies/${companyId}/org-unit-types`
      ),
    enabled: !!companyId,
  });
}

export function useCreateOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string; icon?: string; color?: string; displayOrder?: number }) =>
      apiClient<AdminOrgUnitType>(
        `/api/v2/companies/${data.companyId}/org-unit-types`,
        { method: "POST", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-unit-types"] });
    },
  });
}

export function useUpdateOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...data }: { companyId: string; id: string; name?: string; description?: string; icon?: string; color?: string; displayOrder?: number }) =>
      apiClient<AdminOrgUnitType>(
        `/api/v2/companies/${companyId}/org-unit-types/${id}`,
        { method: "PATCH", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-unit-types"] });
    },
  });
}

export function useArchiveOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<AdminOrgUnitType>(
        `/api/v2/companies/${companyId}/org-unit-types/${id}/archive`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-unit-types"] });
    },
  });
}

export function useRestoreOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<AdminOrgUnitType>(
        `/api/v2/companies/${companyId}/org-unit-types/${id}/restore`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-unit-types"] });
    },
  });
}

// ─── Positions ────────────────────────────────────────────────────────────────

export function usePositions(companyId: string) {
  return useQuery({
    queryKey: ["positions", companyId],
    queryFn: () =>
      apiClient<AdminPosition[]>(
        `/api/v2/companies/${companyId}/positions`
      ),
    enabled: !!companyId,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string; careerLevel?: number; canHaveDirectReports?: boolean }) =>
      apiClient<AdminPosition>(
        `/api/v2/companies/${data.companyId}/positions`,
        { method: "POST", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...data }: { companyId: string; id: string; name?: string; description?: string; careerLevel?: number; canHaveDirectReports?: boolean }) =>
      apiClient<AdminPosition>(
        `/api/v2/companies/${companyId}/positions/${id}`,
        { method: "PATCH", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useArchivePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<AdminPosition>(
        `/api/v2/companies/${companyId}/positions/${id}/archive`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<void>(
        `/api/v2/companies/${companyId}/positions/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export function useRoles(companyId: string) {
  return useQuery({
    queryKey: ["roles", companyId],
    queryFn: () =>
      apiClient<AdminRole[]>(
        `/api/v2/companies/${companyId}/roles`
      ),
    enabled: !!companyId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string }) =>
      apiClient<AdminRole>(
        `/api/v2/companies/${data.companyId}/roles`,
        { method: "POST", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id, ...data }: { companyId: string; id: string; name?: string; description?: string }) =>
      apiClient<AdminRole>(
        `/api/v2/companies/${companyId}/roles/${id}`,
        { method: "PATCH", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useArchiveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<AdminRole>(
        `/api/v2/companies/${companyId}/roles/${id}/archive`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<void>(
        `/api/v2/companies/${companyId}/roles/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

// ─── Features ─────────────────────────────────────────────────────────────────

export function useFeatures(companyId: string) {
  return useQuery({
    queryKey: ["features", companyId],
    queryFn: () =>
      apiClient<CompanyFeature[]>(
        `/api/v2/companies/${companyId}/features`
      ),
    enabled: !!companyId,
  });
}

export function useToggleFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, featureId, enabled }: { companyId: string; featureId: string; enabled: boolean }) =>
      apiClient<CompanyFeature>(
        `/api/v2/companies/${companyId}/features/${featureId}`,
        { method: "PATCH", body: { enabled } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
  });
}
