import { PermissionScopeV2 } from './scope-resolver/scope-resolver.types';

/**
 * Represents an incoming access request to be evaluated by the authorization engine.
 */
export interface AccessRequest {
  userId: string;
  companyId: string;
  feature: string;
  permission: string;
  targetResourceOwnerId?: string;
  targetResourceOrgUnitId?: string;
}

/**
 * The result of evaluating an AccessRequest.
 */
export interface AccessDecision {
  allowed: boolean;
  deniedAtStep?: 2 | 3 | 4 | 5;
  effectiveScope?: PermissionScopeV2;
}

/**
 * Represents a resolved effective permission for a user.
 * This is the cached form of a user's permission set.
 */
export interface EffectivePermission {
  feature: string;
  permission: string;
  scope: PermissionScopeV2;
}
