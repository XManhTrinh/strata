import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { MigrationCommand } from './migration.command';

/**
 * Module providing the migration service and CLI command for converting
 * from the legacy permission system (v1) to the new scalable authorization (v2).
 */
@Module({
  providers: [MigrationService, MigrationCommand],
  exports: [MigrationService, MigrationCommand],
})
export class MigrationModule {}
