import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  minLevelId: string | null;
  maxLevelId: string | null;
  careerLevelId: string | null;  // deprecated
  careerLevel: number | null;     // deprecated
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
  _count?: { assignments: number; permissions: number };
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
        `/companies/${companyId}/org-unit-types`
      ),
    enabled: !!companyId,
  });
}

export function useCreateOrgUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string; icon?: string; color?: string; displayOrder?: number }) =>
      apiClient<AdminOrgUnitType>(
        `/companies/${data.companyId}/org-unit-types`,
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
        `/companies/${companyId}/org-unit-types/${id}`,
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
        `/companies/${companyId}/org-unit-types/${id}/archive`,
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
        `/companies/${companyId}/org-unit-types/${id}/restore`,
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
        `/companies/${companyId}/positions`
      ),
    enabled: !!companyId,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string; minLevelId?: string; maxLevelId?: string; canHaveDirectReports?: boolean }) =>
      apiClient<AdminPosition>(
        `/companies/${data.companyId}/positions`,
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
    mutationFn: ({ companyId, id, ...data }: { companyId: string; id: string; name?: string; description?: string; minLevelId?: string; maxLevelId?: string; canHaveDirectReports?: boolean }) =>
      apiClient<AdminPosition>(
        `/companies/${companyId}/positions/${id}`,
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
        `/companies/${companyId}/positions/${id}/archive`,
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
        `/companies/${companyId}/positions/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

// ─── Career Levels ────────────────────────────────────────────────────────────

export interface CareerLevel {
  id: string;
  schemeId: string;
  rank: number;
  label: string;
  displayName: string | null;
  track: string | null;
}

export interface CareerLevelScheme {
  id: string;
  companyId: string;
  type: string;
  levels: CareerLevel[];
}

export function useCareerLevels(companyId: string) {
  return useQuery({
    queryKey: ["career-levels", companyId],
    queryFn: () => apiClient<CareerLevelScheme>(`/companies/${companyId}/career-levels`),
    enabled: !!companyId,
  });
}

export function useCreateCareerLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; label: string; displayName?: string; rank: number; track?: string }) =>
      apiClient<CareerLevel>(`/companies/${data.companyId}/career-levels`, {
        method: "POST",
        body: data,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["career-levels", vars.companyId] });
    },
  });
}

export function useUpdateCareerLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; levelId: string; label?: string; displayName?: string; rank?: number; track?: string }) =>
      apiClient<CareerLevel>(`/companies/${data.companyId}/career-levels/${data.levelId}`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["career-levels", vars.companyId] });
    },
  });
}

export function useDeleteCareerLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; levelId: string }) =>
      apiClient<void>(`/companies/${data.companyId}/career-levels/${data.levelId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["career-levels", vars.companyId] });
    },
  });
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export function useRoles(companyId: string) {
  return useQuery({
    queryKey: ["roles", companyId],
    queryFn: () =>
      apiClient<AdminRole[]>(
        `/companies/${companyId}/roles`
      ),
    enabled: !!companyId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyId: string; name: string; description?: string }) =>
      apiClient<AdminRole>(
        `/companies/${data.companyId}/roles`,
        { method: "POST", body: data }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useCreateAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId }: { companyId: string }) =>
      apiClient<AdminRole>(
        `/companies/${companyId}/roles/admin`,
        { method: "POST" }
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
        `/companies/${companyId}/roles/${id}`,
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
        `/companies/${companyId}/roles/${id}/archive`,
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
        `/companies/${companyId}/roles/${id}`,
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
        `/companies/${companyId}/features`
      ),
    enabled: !!companyId,
  });
}

export function useAllFeatures() {
  return useQuery({
    queryKey: ["all-features"],
    queryFn: () => apiClient<AdminFeature[]>("/features"),
  });
}

export function useToggleFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, featureId, enabled }: { companyId: string; featureId: string; enabled: boolean }) =>
      apiClient<CompanyFeature>(
        `/companies/${companyId}/features/${featureId}`,
        { method: "PATCH", body: { enabled } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
  });
}

// ─── Role Permissions ─────────────────────────────────────────────────────────

export interface RolePermissionDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    id: string;
    featurePermissionId: string;
    scope: string;
    featurePermission: {
      id: string;
      key: string;
      displayName: string;
      feature: { key: string; displayName: string };
    };
  }>;
}

// Get role with its permissions
export function useRolePermissions(companyId: string, roleId: string) {
  return useQuery({
    queryKey: ["role-permissions", companyId, roleId],
    queryFn: () => apiClient<RolePermissionDetail>(`/companies/${companyId}/roles/${roleId}`),
    enabled: !!companyId && !!roleId,
  });
}

// Bulk add/remove permissions for a role (single API call)
export function useBulkRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, roleId, add, remove }: {
      companyId: string;
      roleId: string;
      add?: Array<{ featureKey: string; permissionKey: string; scope: string }>;
      remove?: Array<{ featureKey: string; permissionKey: string; scope: string }>;
    }) =>
      apiClient(`/companies/${companyId}/roles/${roleId}/permissions/bulk`, {
        method: "POST",
        body: { add: add ?? [], remove: remove ?? [] },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
