import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
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
  ) {}

  /**
   * Registers all features at application startup:
   * 1. Built-in features from the centralized feature-definitions file
   * 2. Features discovered via @RegisterFeature decorator metadata on modules
   */
  async onApplicationBootstrap(): Promise<void> {
    let registeredCount = 0;

    // Phase 1: Register built-in features
    this.logger.log('Registering built-in features...');
    for (const definition of BUILT_IN_FEATURES) {
      try {
        await this.featureRegistry.register(definition);
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
  }
}
