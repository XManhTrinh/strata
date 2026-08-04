import { PermissionScope } from './permissions.decorator';

export interface UserPermission {
  action: string;
  resource: string;
  scope: PermissionScope;
}

export interface ScopeContext {
  /** The ID of the user making the request */
  userId: string;
  /** The ID of the resource owner (if applicable) */
  resourceOwnerId?: string;
  /** IDs of team members managed by the requesting user */
  teamMemberIds?: string[];
  /** The organization ID of the requesting user */
  organizationId?: string;
  /** The organization ID of the resource (if applicable) */
  resourceOrganizationId?: string;
}

/**
 * Determines the numeric level of a scope for comparison.
 * Higher level = broader access.
 */
export function scopeLevel(scope: PermissionScope): number {
  switch (scope) {
    case PermissionScope.SELF:
      return 1;
    case PermissionScope.TEAM:
      return 2;
    case PermissionScope.ORGANIZATION:
      return 3;
  }
}

/**
 * Checks whether the user's granted scope is at least as broad as the required scope.
 * E.g., ORGANIZATION scope covers TEAM and SELF requirements.
 */
export function isScopeSufficient(
  grantedScope: PermissionScope,
  requiredScope: PermissionScope,
): boolean {
  return scopeLevel(grantedScope) >= scopeLevel(requiredScope);
}

/**
 * Evaluates whether a user has a required permission (action + resource)
 * with a scope that meets or exceeds the required scope.
 */
export function hasPermission(
  userPermissions: UserPermission[],
  requiredAction: string,
  requiredResource: string,
  requiredScope: PermissionScope,
): boolean {
  return userPermissions.some(
    (p) =>
      p.action === requiredAction &&
      p.resource === requiredResource &&
      isScopeSufficient(p.scope, requiredScope),
  );
}

/**
 * Evaluates whether a user can access a specific resource based on their
 * scope and the context of the resource.
 *
 * - SELF: User can only access their own resources (resourceOwnerId === userId)
 * - TEAM: User can access resources belonging to their team members
 * - ORGANIZATION: User can access all resources in their organization
 */
export function canAccessResource(
  grantedScope: PermissionScope,
  context: ScopeContext,
): boolean {
  switch (grantedScope) {
    case PermissionScope.SELF:
      return context.resourceOwnerId === context.userId;

    case PermissionScope.TEAM:
      // Team scope: user can access their own resources OR team members' resources
      if (context.resourceOwnerId === context.userId) {
        return true;
      }
      if (context.teamMemberIds && context.resourceOwnerId) {
        return context.teamMemberIds.includes(context.resourceOwnerId);
      }
      return false;

    case PermissionScope.ORGANIZATION:
      // Organization scope: user can access all resources in their organization
      if (!context.organizationId || !context.resourceOrganizationId) {
        // If no org context, fall back to allowing (assume same org)
        return true;
      }
      return context.organizationId === context.resourceOrganizationId;
  }
}

/**
 * Resolves the highest scope a user has for a given action + resource
 * from their list of permissions.
 * Returns undefined if no matching permission is found.
 */
export function resolveHighestScope(
  userPermissions: UserPermission[],
  action: string,
  resource: string,
): PermissionScope | undefined {
  let highest: PermissionScope | undefined;

  for (const p of userPermissions) {
    if (p.action === action && p.resource === resource) {
      if (!highest || scopeLevel(p.scope) > scopeLevel(highest)) {
        highest = p.scope;
      }
    }
  }

  return highest;
}
