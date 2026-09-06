/**
 * The six permission scopes supported by the authorization engine.
 * Ordered from narrowest (OWN) to broadest (GLOBAL).
 */
export enum PermissionScope {
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
export const SCOPE_LEVELS: Record<PermissionScope, number> = {
  [PermissionScope.OWN]: 1,
  [PermissionScope.DIRECT_REPORTS]: 2,
  [PermissionScope.ORGANIZATION_UNIT]: 3,
  [PermissionScope.BRANCH]: 4,
  [PermissionScope.COMPANY]: 5,
  [PermissionScope.GLOBAL]: 6,
};

/**
 * Returns the broadest scope from an array of scopes.
 * Uses the SCOPE_LEVELS ordering to determine which is broadest.
 */
export function maxScope(scopes: PermissionScope[]): PermissionScope {
  if (scopes.length === 0) {
    throw new Error('Cannot determine max scope from empty array');
  }

  return scopes.reduce((broadest, current) =>
    SCOPE_LEVELS[current] > SCOPE_LEVELS[broadest] ? current : broadest,
  );
}
