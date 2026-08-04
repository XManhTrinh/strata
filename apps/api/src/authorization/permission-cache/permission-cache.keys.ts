/**
 * Redis key patterns for the authorization cache layer.
 * All keys are namespaced to avoid collisions with other subsystems.
 */

/** TTL values in seconds */
export const CACHE_TTL = {
  USER_PERMISSIONS: 300, // 5 minutes
  BRANCH_SCOPE: 600, // 10 minutes
  DIRECT_REPORTS: 300, // 5 minutes
  FEATURE_ENABLED: 600, // 10 minutes
  SUPER_ADMIN: 300, // 5 minutes
} as const;

/** Key pattern prefixes */
export const KEY_PREFIX = {
  PERMISSIONS: 'permissions:v2',
  BRANCH_SCOPE: 'scope:branch',
  DIRECT_REPORTS: 'scope:reports',
  FEATURE_ENABLED: 'feature:enabled',
  SUPER_ADMIN: 'auth:super_admin',
} as const;

/**
 * Builds a cache key for a user's effective permissions.
 * Pattern: permissions:v2:{companyId}:{userId}
 */
export function userPermissionsKey(
  companyId: string,
  userId: string,
): string {
  return `${KEY_PREFIX.PERMISSIONS}:${companyId}:${userId}`;
}

/**
 * Builds a cache key for branch scope (descendant org unit IDs).
 * Pattern: scope:branch:{companyId}:{orgUnitId}
 */
export function branchScopeKey(
  companyId: string,
  orgUnitId: string,
): string {
  return `${KEY_PREFIX.BRANCH_SCOPE}:${companyId}:${orgUnitId}`;
}

/**
 * Builds a cache key for direct reports (user IDs reporting to a manager).
 * Pattern: scope:reports:{companyId}:{userId}
 */
export function directReportsKey(
  companyId: string,
  userId: string,
): string {
  return `${KEY_PREFIX.DIRECT_REPORTS}:${companyId}:${userId}`;
}

/**
 * Builds a cache key for feature enabled status per company.
 * Pattern: feature:enabled:{companyId}
 */
export function featureEnabledKey(companyId: string): string {
  return `${KEY_PREFIX.FEATURE_ENABLED}:${companyId}`;
}

/**
 * Builds a cache key for super admin user IDs per company.
 * Pattern: auth:super_admin:{companyId}
 */
export function superAdminKey(companyId: string): string {
  return `${KEY_PREFIX.SUPER_ADMIN}:${companyId}`;
}

/**
 * Builds a glob pattern to match all user permission keys for a company.
 * Used for company-wide invalidation.
 */
export function companyPermissionsPattern(companyId: string): string {
  return `${KEY_PREFIX.PERMISSIONS}:${companyId}:*`;
}

/**
 * Builds a glob pattern to match all branch scope keys for a company.
 */
export function companyBranchScopePattern(companyId: string): string {
  return `${KEY_PREFIX.BRANCH_SCOPE}:${companyId}:*`;
}
