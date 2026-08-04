import { Injectable, Logger } from '@nestjs/common';
import { MigrationService, MigrationReport } from './migration.service';

export interface MigrationCommandOptions {
  dryRun?: boolean;
  companyId?: string;
}

/**
 * Migration command service that can be invoked as a NestJS standalone script.
 *
 * Usage (as a NestJS injectable called from a script):
 *   const app = await NestFactory.createApplicationContext(AppModule);
 *   const command = app.get(MigrationCommand);
 *   await command.run({ dryRun: true });
 *   await app.close();
 *
 * Or via a custom script:
 *   npx ts-node -e "
 *     const { NestFactory } = require('@nestjs/core');
 *     const { AppModule } = require('./apps/api/src/app.module');
 *     async function main() {
 *       const app = await NestFactory.createApplicationContext(AppModule);
 *       const cmd = app.get(MigrationCommand);
 *       await cmd.run({ dryRun: process.argv.includes('--dry-run') });
 *       await app.close();
 *     }
 *     main();
 *   "
 *
 * Flags:
 *   --dry-run: Report only, no writes
 *   --company-id <id>: Migrate a single company/organization
 */
@Injectable()
export class MigrationCommand {
  private readonly logger = new Logger(MigrationCommand.name);

  constructor(private readonly migrationService: MigrationService) {}

  /**
   * Runs the migration with the given options.
   * In dry-run mode, only generates a report without making changes.
   */
  async run(options: MigrationCommandOptions = {}): Promise<MigrationReport> {
    const { dryRun = false, companyId } = options;

    this.logger.log('='.repeat(60));
    this.logger.log('  Permission System Migration v1 → v2');
    this.logger.log('='.repeat(60));
    this.logger.log(`  Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE MIGRATION'}`);
    if (companyId) {
      this.logger.log(`  Target: Company/Organization ID: ${companyId}`);
    } else {
      this.logger.log('  Target: All organizations');
    }
    this.logger.log('='.repeat(60));

    let report: MigrationReport;

    if (dryRun) {
      this.logger.log('Running in dry-run mode — generating report only...');
      report = await this.migrationService.generateReport(companyId);
    } else {
      this.logger.log('Starting live migration...');
      report = await this.migrationService.migrate(companyId);
    }

    this.printReport(report);
    return report;
  }

  /**
   * Parses command-line arguments and runs the migration.
   * Call this from a standalone script entry point.
   */
  async runFromArgs(args: string[]): Promise<MigrationReport> {
    const options: MigrationCommandOptions = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--dry-run') {
        options.dryRun = true;
      } else if (args[i] === '--company-id' && args[i + 1]) {
        options.companyId = args[i + 1];
        i++; // skip the value
      }
    }

    return this.run(options);
  }

  private printReport(report: MigrationReport): void {
    this.logger.log('');
    this.logger.log('─'.repeat(60));
    this.logger.log('  MIGRATION REPORT');
    this.logger.log('─'.repeat(60));
    this.logger.log(`  Started at:    ${report.startedAt.toISOString()}`);
    if (report.completedAt) {
      this.logger.log(`  Completed at:  ${report.completedAt.toISOString()}`);
      const durationMs =
        report.completedAt.getTime() - report.startedAt.getTime();
      this.logger.log(`  Duration:      ${durationMs}ms`);
    }
    this.logger.log('');
    this.logger.log('  ┌─────────────────────────────────┬───────┐');
    this.logger.log('  │ Entity                          │ Count │');
    this.logger.log('  ├─────────────────────────────────┼───────┤');
    this.logger.log(
      `  │ Companies created                │ ${String(report.companiesCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Org unit types created           │ ${String(report.orgUnitTypesCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Org units created                │ ${String(report.orgUnitsCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Memberships created              │ ${String(report.membershipsCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Positions created                │ ${String(report.positionsCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Features registered              │ ${String(report.featuresRegistered).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Feature permissions created      │ ${String(report.featurePermissionsCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Roles created                    │ ${String(report.rolesCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Role permissions created         │ ${String(report.rolePermissionsCreated).padStart(5)} │`,
    );
    this.logger.log(
      `  │ Role assignments created         │ ${String(report.roleAssignmentsCreated).padStart(5)} │`,
    );
    this.logger.log('  └─────────────────────────────────┴───────┘');

    if (report.unmappedScopes.length > 0) {
      this.logger.warn('');
      this.logger.warn(
        `  ⚠ Unmapped scopes encountered: ${[...new Set(report.unmappedScopes)].join(', ')}`,
      );
    }

    if (report.errors.length > 0) {
      this.logger.error('');
      this.logger.error(`  ✗ Errors (${report.errors.length}):`);
      for (const error of report.errors.slice(0, 20)) {
        this.logger.error(`    - ${error}`);
      }
      if (report.errors.length > 20) {
        this.logger.error(
          `    ... and ${report.errors.length - 20} more errors`,
        );
      }
    }

    if (report.errors.length === 0) {
      this.logger.log('');
      this.logger.log('  ✓ Migration completed without errors');
    }

    this.logger.log('─'.repeat(60));
  }
}
