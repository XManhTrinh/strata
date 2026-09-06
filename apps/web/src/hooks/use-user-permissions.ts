"use client";

import { useUserRole } from "./use-user-role";
import { useCompanyId } from "./use-company";
import { useRolePermissions, type RolePermissionDetail } from "@/services";

export interface EffectivePermission {
  feature: string;
  permission: string;
  scope: string;
}

/**
 * Hook that provides the current user's effective permissions
 * based on the selected role in the role switcher.
 *
 * - "super_admin": all permissions (full access)
 * - Any company role ID: fetches that role's permissions from the API
 */
export function useUserPermissions() {
  const { role } = useUserRole();
  const companyId = useCompanyId();
  const isSuperAdmin = role === "super_admin";

  // Fetch role permissions when a company role is selected
  const { data: roleDetail } = useRolePermissions(
    companyId,
    isSuperAdmin ? "" : role,
  );

  // Map role permissions to EffectivePermission format
  const permissions: EffectivePermission[] = isSuperAdmin
    ? [] // Super admin bypasses permission checks — empty array is fine
    : (roleDetail?.permissions ?? []).map((rp) => ({
        feature: rp.featurePermission.feature.key,
        permission: rp.featurePermission.key,
        scope: rp.scope,
      }));

  function hasPermission(feature: string, permission?: string): boolean {
    if (isSuperAdmin) return true;
    if (!permission) {
      return permissions.some((p) => p.feature === feature);
    }
    return permissions.some(
      (p) => p.feature === feature && p.permission === permission,
    );
  }

  function hasFeatureAccess(feature: string): boolean {
    if (isSuperAdmin) return true;
    return permissions.some((p) => p.feature === feature);
  }

  return { permissions, isSuperAdmin, hasPermission, hasFeatureAccess };
}
