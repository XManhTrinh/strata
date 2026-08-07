import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { FeatureRegistryService } from '../feature-registry/feature-registry.service';
import { MigrationService } from './migration.service';
import { MigrationCommand } from './migration.command';

/**
 * Module providing the migration service and CLI command for converting
 * from the legacy permission system (v1) to the new scalable authorization (v2).
 */
@Module({
  imports: [AuthModule],
  providers: [MigrationService, MigrationCommand, FeatureRegistryService],
  exports: [MigrationService, MigrationCommand],
})
export class MigrationModule {}
