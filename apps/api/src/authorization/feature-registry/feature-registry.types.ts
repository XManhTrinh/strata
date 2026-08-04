/**
 * Defines a feature that can be registered in the authorization system.
 * Features self-register at application startup via the @RegisterFeature decorator.
 */
export interface FeatureDefinition {
  key: string;
  displayName: string;
  description: string;
  permissions: FeaturePermissionDefinition[];
}

/**
 * Defines a single permission within a feature.
 * Permissions represent business-specific actions (not limited to CRUD).
 */
export interface FeaturePermissionDefinition {
  key: string;
  displayName: string;
  description: string;
}

/**
 * Metadata key used to store feature definitions on decorated classes.
 */
export const FEATURE_REGISTRY_METADATA_KEY = '__feature_registry_definition__';
