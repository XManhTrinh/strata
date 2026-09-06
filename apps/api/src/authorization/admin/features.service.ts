import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { FeatureRegistryService } from '../feature-registry/feature-registry.service';
import { featureEnabledKey } from '../permission-cache/permission-cache.keys';

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly featureRegistry: FeatureRegistryService,
  ) {}

  /**
   * List all registered features (platform-wide).
   */
  async findAll() {
    return this.prisma.feature.findMany({
      include: { permissions: true },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get a feature by its key with all its permissions.
   */
  async findByKey(key: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { key },
      include: { permissions: true },
    });
    if (!feature) {
      throw new NotFoundException(`Feature with key "${key}" not found`);
    }
    return feature;
  }

  /**
   * List features for a company with their enabled status.
   */
  async findForCompany(companyId: string) {
    const features = await this.prisma.feature.findMany({
      include: {
        permissions: true,
        companies: {
          where: { companyId },
        },
      },
      orderBy: { key: 'asc' },
    });

    return features.map((f) => ({
      featureId: f.id,
      enabled: f.companies.length === 0 ? true : f.companies[0].enabled,
      feature: {
        id: f.id,
        key: f.key,
        displayName: f.displayName,
        description: f.description,
        permissions: f.permissions,
      },
    }));
  }

  /**
   * Enable or disable a feature for a company.
   */
  async toggleFeature(companyId: string, featureId: string, enabled: boolean) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
    });
    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    // Authorization feature cannot be disabled (prevents lockout)
    if (feature.key === 'authorization' && !enabled) {
      throw new BadRequestException(
        'The Authorization feature cannot be disabled',
      );
    }

    const result = await this.prisma.companyFeature.upsert({
      where: {
        companyId_featureId: { companyId, featureId },
      },
      create: { companyId, featureId, enabled },
      update: { enabled },
    });

    // Invalidate feature enabled cache
    try {
      const cacheKey = featureEnabledKey(companyId);
      await this.redis.del(cacheKey);
    } catch {
      // Graceful degradation
    }

    return result;
  }
}
