/**
 * The six permission scopes supported by the authorization engine.
 * Ordered from narrowest (OWN) to broadest (GLOBAL).
 */
export enum PermissionScopeV2 {
  OWN = 'OWN',
  DIRECT_REPORTS = 'DIRECT_REPORTS',
  ORGANIZATION_UNIT = 'ORGANIZATION_UNIT',
  BRANCH = 'BRANCH',
  COMPANY = 'COMPANY',
  GLOBAL = 'GLOBAL',
}

/**
 * Numeric ordering of scopes for comparison.
 * Higher number = broader scope.
 */
export const SCOPE_LEVELS: Record<PermissionScopeV2, number> = {
  [PermissionScopeV2.OWN]: 1,
  [PermissionScopeV2.DIRECT_REPORTS]: 2,
  [PermissionScopeV2.ORGANIZATION_UNIT]: 3,
  [PermissionScopeV2.BRANCH]: 4,
  [PermissionScopeV2.COMPANY]: 5,
  [PermissionScopeV2.GLOBAL]: 6,
};

/**
 * Returns the broadest scope from an array of scopes.
 * Uses the SCOPE_LEVELS ordering to determine which is broadest.
 */
export function maxScope(scopes: PermissionScopeV2[]): PermissionScopeV2 {
  if (scopes.length === 0) {
    throw new Error('Cannot determine max scope from empty array');
  }

  return scopes.reduce((broadest, current) =>
    SCOPE_LEVELS[current] > SCOPE_LEVELS[broadest] ? current : broadest,
  );
}
