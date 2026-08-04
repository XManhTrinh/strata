import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { OrgUnitTypesController } from './org-unit-types.controller';
import { OrgUnitTypesService } from './org-unit-types.service';
import { OrgUnitsController } from './org-units.controller';
import { OrgUnitsService } from './org-units.service';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [AuthModule],
  controllers: [
    OrgUnitTypesController,
    OrgUnitsController,
    PositionsController,
    RolesController,
    FeaturesController,
    ReportingController,
  ],
  providers: [
    OrgUnitTypesService,
    OrgUnitsService,
    PositionsService,
    RolesService,
    FeaturesService,
    ReportingService,
  ],
  exports: [
    OrgUnitTypesService,
    OrgUnitsService,
    PositionsService,
    RolesService,
    FeaturesService,
    ReportingService,
  ],
})
export class AdminModule {}
