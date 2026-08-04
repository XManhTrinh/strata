"use client";

import { create } from "zustand";
import { useUserRole } from "./use-user-role";

/**
 * Represents a user's effective permission as returned by the authorization engine.
 * Format: "feature:permission:scope"
 */
export interface EffectivePermission {
  feature: string;
  permission: string;
  scope: string;
}

/**
 * Mock permission sets per role for development.
 * In production, these would come from GET /api/v2/companies/:id/users/:id/effective-permissions
 */
const SUPER_ADMIN_PERMISSIONS: EffectivePermission[] = [
  // Super Admin only gets platform/structure administration permissions
  // They configure the business — they don't operate it
  { feature: "authorization", permission: "manage_roles", scope: "COMPANY" },
  { feature: "authorization", permission: "manage_org_structure", scope: "COMPANY" },
  { feature: "authorization", permission: "manage_positions", scope: "COMPANY" },
  { feature: "authorization", permission: "manage_features", scope: "COMPANY" },
];

const MANAGER_PERMISSIONS: EffectivePermission[] = [
  { feature: "employees", permission: "view", scope: "DIRECT_REPORTS" },
  { feature: "employees", permission: "create", scope: "DIRECT_REPORTS" },
  { feature: "employees", permission: "update", scope: "DIRECT_REPORTS" },
  { feature: "people", permission: "view", scope: "COMPANY" },
  { feature: "people", permission: "create", scope: "DIRECT_REPORTS" },
  { feature: "leave", permission: "view_own", scope: "OWN" },
  { feature: "leave", permission: "submit_request", scope: "OWN" },
  { feature: "leave", permission: "approve", scope: "DIRECT_REPORTS" },
  { feature: "capacity", permission: "view_own", scope: "OWN" },
  { feature: "capacity", permission: "manage", scope: "DIRECT_REPORTS" },
  { feature: "budgets", permission: "view", scope: "BRANCH" },
  { feature: "budgets", permission: "manage", scope: "BRANCH" },
  { feature: "reports", permission: "view", scope: "DIRECT_REPORTS" },
  { feature: "org_chart", permission: "view", scope: "COMPANY" },
  { feature: "calendar", permission: "view", scope: "DIRECT_REPORTS" },
];

const USER_PERMISSIONS: EffectivePermission[] = [
  { feature: "org_chart", permission: "view", scope: "COMPANY" },
  { feature: "calendar", permission: "view_own", scope: "OWN" },
  { feature: "leave", permission: "view_own", scope: "OWN" },
  { feature: "leave", permission: "submit_request", scope: "OWN" },
  { feature: "employees", permission: "view", scope: "OWN" },
];

/**
 * Hook that provides the current user's effective permissions.
 * Uses mock data based on the dev role switcher.
 * In production, this would fetch from the API on login.
 */
export function useUserPermissions() {
  const { role } = useUserRole();

  const isSuperAdmin = role === "super_admin";

  const permissions: EffectivePermission[] =
    role === "super_admin"
      ? SUPER_ADMIN_PERMISSIONS
      : role === "manager"
        ? MANAGER_PERMISSIONS
        : USER_PERMISSIONS;

  /**
   * Checks if the user has a specific feature permission.
   * Permission-based check — same logic for all roles including Super Admin.
   */
  function hasPermission(feature: string, permission?: string): boolean {
    if (!permission) {
      return permissions.some((p) => p.feature === feature);
    }
    return permissions.some(
      (p) => p.feature === feature && p.permission === permission
    );
  }

  /**
   * Checks if the user has access to any permission in a feature.
   */
  function hasFeatureAccess(feature: string): boolean {
    return permissions.some((p) => p.feature === feature);
  }

  return { permissions, isSuperAdmin, hasPermission, hasFeatureAccess };
}
