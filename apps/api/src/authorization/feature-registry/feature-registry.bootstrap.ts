import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { PrismaClient } from '@strata/database';
import {
  FeatureDefinition,
  FEATURE_REGISTRY_METADATA_KEY,
} from './feature-registry.types';
import { FeatureRegistryService } from './feature-registry.service';
import { BUILT_IN_FEATURES } from '../feature-definitions';

@Injectable()
export class FeatureRegistryBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeatureRegistryBootstrap.name);

  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly featureRegistry: FeatureRegistryService,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * Registers all features at application startup:
   * 1. Built-in features from the centralized feature-definitions file
   * 2. Features discovered via @RegisterFeature decorator metadata on modules
   */
  async onApplicationBootstrap(): Promise<void> {
    let registeredCount = 0;
    const registeredKeys = new Set<string>();

    // Phase 1: Register built-in features
    this.logger.log('Registering built-in features...');
    for (const definition of BUILT_IN_FEATURES) {
      try {
        await this.featureRegistry.register(definition);
        registeredKeys.add(definition.key);
        registeredCount++;
      } catch (error) {
        this.logger.error(
          `Failed to register built-in feature "${definition.key}": ${error}`,
        );
      }
    }

    // Phase 2: Scan modules for @RegisterFeature metadata
    this.logger.log('Scanning modules for @RegisterFeature metadata...');
    for (const [, moduleRef] of this.modulesContainer) {
      const metatype = moduleRef.metatype;
      if (!metatype) continue;

      const definition: FeatureDefinition | undefined =
        Reflect.getMetadata(FEATURE_REGISTRY_METADATA_KEY, metatype);

      if (definition) {
        try {
          await this.featureRegistry.register(definition);
          registeredKeys.add(definition.key);
          registeredCount++;
        } catch (error) {
          this.logger.error(
            `Failed to register feature "${definition.key}": ${error}`,
          );
        }
      }
    }

    this.logger.log(
      `Feature registration complete. Registered ${registeredCount} feature(s).`,
    );

    // Phase 3: Clean up stale features no longer in BUILT_IN_FEATURES
    await this.cleanupStaleFeatures(registeredKeys);
  }

  /**
   * Removes features from the database that are no longer defined in code.
   * Cascades: CompanyFeature, RolePermission → FeaturePermission → Feature.
   */
  private async cleanupStaleFeatures(activeKeys: Set<string>): Promise<void> {
    try {
      const allDbFeatures = await this.prisma.feature.findMany({
        select: { id: true, key: true },
      });

      const staleFeatures = allDbFeatures.filter((f) => !activeKeys.has(f.key));
      if (staleFeatures.length === 0) return;

      this.logger.log(
        `Cleaning up ${staleFeatures.length} stale feature(s): ${staleFeatures.map((f) => f.key).join(', ')}`,
      );

      for (const feature of staleFeatures) {
        // Delete in order: RolePermissions → CompanyFeatures → FeaturePermissions → Feature
        const permissions = await this.prisma.featurePermission.findMany({
          where: { featureId: feature.id },
          select: { id: true },
        });
        const permIds = permissions.map((p) => p.id);

        if (permIds.length > 0) {
          await this.prisma.rolePermission.deleteMany({
            where: { featurePermissionId: { in: permIds } },
          });
        }

        await this.prisma.companyFeature.deleteMany({
          where: { featureId: feature.id },
        });

        await this.prisma.featurePermission.deleteMany({
          where: { featureId: feature.id },
        });

        await this.prisma.feature.delete({
          where: { id: feature.id },
        });

        this.logger.log(`Deleted stale feature: ${feature.key}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clean up stale features: ${error}`);
    }
  }
}
