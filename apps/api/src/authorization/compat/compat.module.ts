import { Module } from '@nestjs/common';
import { CompatController } from './compat.controller';

/**
 * Module providing backward-compatible v1 permission endpoints.
 *
 * This module wraps the new authorization engine with endpoints that
 * translate old scope names (SELF, TEAM, ORGANIZATION) to the new
 * system (OWN, DIRECT_REPORTS, COMPANY).
 *
 * Deprecated: This module will be removed once all clients have migrated
 * to the v2 authorization API.
 */
@Module({
  controllers: [CompatController],
})
export class CompatModule {}
