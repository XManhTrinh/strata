import { SetMetadata } from '@nestjs/common';

export enum PermissionScope {
  SELF = 'SELF',
  TEAM = 'TEAM',
  ORGANIZATION = 'ORGANIZATION',
}

export interface RequiredPermission {
  resource: string;
  action: string;
  scope: PermissionScope;
}

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Decorator to require a specific permission with scope for an endpoint.
 * Usage: @RequirePermission('employees', 'read', PermissionScope.TEAM)
 */
export const RequirePermission = (
  resource: string,
  action: string,
  scope: PermissionScope,
) => SetMetadata(PERMISSION_KEY, { resource, action, scope } as RequiredPermission);
