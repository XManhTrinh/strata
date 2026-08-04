import 'reflect-metadata';
import {
  FeatureDefinition,
  FEATURE_REGISTRY_METADATA_KEY,
} from './feature-registry.types';

/**
 * Class decorator that registers a feature definition on a NestJS module.
 * At application startup, the FeatureRegistryBootstrap scans all modules
 * for this metadata and registers them with the feature registry.
 *
 * Usage:
 * @RegisterFeature({
 *   key: 'leave',
 *   displayName: 'Leave Management',
 *   description: 'Employee leave workflow',
 *   permissions: [
 *     { key: 'view_own', displayName: 'View Own', description: 'View own requests' },
 *     { key: 'approve', displayName: 'Approve', description: 'Approve requests' },
 *   ],
 * })
 * @Module({ ... })
 * export class LeaveModule {}
 */
export function RegisterFeature(definition: FeatureDefinition): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(
      FEATURE_REGISTRY_METADATA_KEY,
      definition,
      target,
    );
  };
}
