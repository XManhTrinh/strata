import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import {
  FeatureDefinition,
  FeaturePermissionDefinition,
} from './feature-registry.types';
import {
  featureEnabledKey,
  CACHE_TTL,
} from '../permission-cache/permission-cache.keys';

@Injectable()
export class FeatureRegistryService {
  private readonly logger = new Logger(FeatureRegistryService.name);

  /** In-memory registry for fast lookups during authorization */
  private readonly registeredFeatures = new Map<string, FeatureDefinition>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Registers a feature definition. Upserts to the database (idempotent).
   * - Creates the Feature record if it doesn't exist
   * - Upserts all FeaturePermission records (new permissions are added, existing ones updated)
   * - Deprecated permissions are NOT deleted (preserved for audit history)
   */
  async register(definition: FeatureDefinition): Promise<void> {
    this.logger.log(`Registering feature: ${definition.key}`);

    // Store in memory for fast lookups
    this.registeredFeatures.set(definition.key, definition);

    // Upsert Feature record in DB
    const feature = await this.prisma.feature.upsert({
      where: { key: definition.key },
      create: {
        key: definition.key,
        displayName: definition.displayName,
        description: definition.description,
      },
      update: {
        displayName: definition.displayName,
        description: definition.description,
      },
    });

    // Upsert each FeaturePermission
    for (const perm of definition.permissions) {
      await this.prisma.featurePermission.upsert({
        where: {
          featureId_key: { featureId: feature.id, key: perm.key },
        },
        create: {
          featureId: feature.id,
          key: perm.key,
          displayName: perm.displayName,
          description: perm.description,
        },
        update: {
          displayName: perm.displayName,
          description: perm.description,
        },
      });
    }
  }

  /**
   * Checks if a feature:permission combination is valid (exists in the registry).
   */
  async isValidAction(
    featureKey: string,
    permissionKey: string,
  ): Promise<boolean> {
    // First check in-memory registry (fast path)
    const feature = this.registeredFeatures.get(featureKey);
    if (feature) {
      return feature.permissions.some((p) => p.key === permissionKey);
    }

    // Fall back to DB check
    const dbFeature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
      include: { permissions: { where: { key: permissionKey } } },
    });

    return (dbFeature?.permissions?.length ?? 0) > 0;
  }

  /**
   * Checks if a feature is enabled for a specific company.
   * Uses Redis cache for performance. Defaults to true if no CompanyFeature record exists
   * (features are enabled by default unless explicitly disabled).
   */
  async isEnabledForCompany(
    featureKey: string,
    companyId: string,
  ): Promise<boolean> {
    // Check Redis hash cache first
    try {
      const cacheKey = featureEnabledKey(companyId);
      const cached = await this.redis.hget(cacheKey, featureKey);
      if (cached !== null) {
        return cached === '1';
      }
    } catch (error) {
      this.logger.warn(`Redis HGET failed for feature enabled check: ${error}`);
    }

    // Cache miss — query DB
    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
      select: { id: true },
    });

    if (!feature) return false;

    const companyFeature = await this.prisma.companyFeature.findUnique({
      where: {
        companyId_featureId: { companyId, featureId: feature.id },
      },
      select: { enabled: true },
    });

    // Default: enabled if no record exists
    const enabled = companyFeature?.enabled ?? true;

    // Cache the result
    try {
      const cacheKey = featureEnabledKey(companyId);
      await this.redis.hset(cacheKey, featureKey, enabled ? '1' : '0');
      await this.redis.expire(cacheKey, CACHE_TTL.FEATURE_ENABLED);
    } catch (error) {
      this.logger.warn(`Redis HSET failed for feature enabled cache: ${error}`);
    }

    return enabled;
  }

  /**
   * Returns all registered feature definitions.
   */
  getAll(): FeatureDefinition[] {
    return Array.from(this.registeredFeatures.values());
  }

  /**
   * Returns a feature definition by key, or null if not found.
   */
  getByKey(featureKey: string): FeatureDefinition | null {
    return this.registeredFeatures.get(featureKey) ?? null;
  }
}
