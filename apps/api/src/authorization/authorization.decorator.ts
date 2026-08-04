import { SetMetadata } from '@nestjs/common';

export const FEATURE_PERMISSION_KEY = 'requiredFeaturePermission';

export interface RequiredFeaturePermission {
  feature: string;
  permission: string;
}

/**
 * Decorator to require a specific feature permission for an endpoint.
 * Works with the AuthorizationGuard to enforce access control.
 *
 * Usage:
 * @RequireFeaturePermission('leave', 'approve')
 * @Controller('leave')
 * export class LeaveController { ... }
 */
export const RequireFeaturePermission = (
  feature: string,
  permission: string,
) =>
  SetMetadata(FEATURE_PERMISSION_KEY, {
    feature,
    permission,
  } as RequiredFeaturePermission);
