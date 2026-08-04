import { PermissionScopeV2 } from '../scope-resolver/scope-resolver.types';
import {
  InvalidPermissionFormatError,
  ParsedPermission,
} from './permission-serializer.types';

/**
 * Regex for validating individual segments: lowercase alphanumeric + underscore only.
 */
const VALID_SEGMENT = /^[a-z0-9_]+$/;

/**
 * Serializes a permission tuple to the canonical string format.
 * Format: "feature:permission:scope" (scope is lowercased).
 */
export function serialize(
  feature: string,
  permission: string,
  scope: PermissionScopeV2,
): string {
  return `${feature}:${permission}:${scope.toLowerCase()}`;
}

/**
 * Parses a permission string into its component parts.
 * Validates:
 * - Exactly 3 colon-separated segments
 * - Each segment contains only lowercase alphanumeric + underscore
 * - Scope is a valid PermissionScopeV2 enum value
 *
 * @throws InvalidPermissionFormatError if the string is malformed
 */
export function parse(permissionString: string): ParsedPermission {
  const segments = permissionString.split(':');

  if (segments.length !== 3) {
    throw new InvalidPermissionFormatError(
      `Expected exactly 3 colon-separated segments, got ${segments.length}`,
    );
  }

  const [feature, permission, scopeStr] = segments;

  if (!VALID_SEGMENT.test(feature)) {
    throw new InvalidPermissionFormatError(
      `Invalid feature key: "${feature}". Must contain only lowercase alphanumeric characters and underscores.`,
    );
  }

  if (!VALID_SEGMENT.test(permission)) {
    throw new InvalidPermissionFormatError(
      `Invalid permission key: "${permission}". Must contain only lowercase alphanumeric characters and underscores.`,
    );
  }

  const scope = scopeStr.toUpperCase() as PermissionScopeV2;
  if (!Object.values(PermissionScopeV2).includes(scope)) {
    throw new InvalidPermissionFormatError(
      `Invalid scope value: "${scopeStr}". Must be one of: ${Object.values(PermissionScopeV2).map((s) => s.toLowerCase()).join(', ')}`,
    );
  }

  return { feature, permission, scope };
}
