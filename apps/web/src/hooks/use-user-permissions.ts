"use client";

import { useMemo } from "react";
import { useUserRole } from "./use-user-role";
import { useCompanyId } from "./use-company";
import { useRolePermissions, useFeatures } from "@/services";

export interface EffectivePermission {
  feature: string;
  permission: string;
  scope: string;
}

/**
 * Hook that provides the current user's effective permissions
 * based on the selected role in the role switcher.
 *
 * Checks both:
 * 1. Role-level permissions (does the role have access to this feature?)
 * 2. Company-level feature toggles (is the feature enabled for this workspace?)
 *
 * A sidebar item only shows if BOTH conditions are met.
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

  // Fetch company feature toggles (enabled/disabled per company)
  const { data: companyFeatures } = useFeatures(companyId);

  // Build a set of disabled feature keys for fast lookup
  const disabledFeatures = useMemo(() => {
    const disabled = new Set<string>();
    if (companyFeatures) {
      for (const cf of companyFeatures) {
        if (!cf.enabled && cf.feature?.key) {
          disabled.add(cf.feature.key);
        }
      }
    }
    return disabled;
  }, [companyFeatures]);

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

  /**
   * Returns true if the user's role has any permission in this feature
   * AND the feature is enabled at the company level.
   */
  function hasFeatureAccess(feature: string): boolean {
    if (isSuperAdmin) return true;
    // Feature must be enabled at the company level
    if (disabledFeatures.has(feature)) return false;
    // Role must have at least one permission in this feature
    return permissions.some((p) => p.feature === feature);
  }

  return { permissions, isSuperAdmin, hasPermission, hasFeatureAccess, disabledFeatures };
}
