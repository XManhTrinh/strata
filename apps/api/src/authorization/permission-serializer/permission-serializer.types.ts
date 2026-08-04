import { PermissionScopeV2 } from '../scope-resolver/scope-resolver.types';

/**
 * Represents a parsed permission tuple from the canonical string format.
 */
export interface ParsedPermission {
  feature: string;
  permission: string;
  scope: PermissionScopeV2;
}

/**
 * Custom error thrown when a permission string does not conform to
 * the expected format: "feature:permission:scope"
 */
export class InvalidPermissionFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionFormatError';
    Object.setPrototypeOf(this, InvalidPermissionFormatError.prototype);
  }
}
