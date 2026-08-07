import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgChartService } from './org-chart.service';
import { OrgTreeNode, UnitViewResponse } from './org-chart.types';

@Controller('api/v2/companies/:companyId/org-chart')
@UseGuards(AuthGuard)
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get()
  async getTree(@Param('companyId') companyId: string): Promise<OrgTreeNode[]> {
    return this.service.getTree(companyId);
  }

  @Get('unit/:unitId')
  async getUnitView(
    @Param('companyId') companyId: string,
    @Param('unitId') unitId: string,
  ): Promise<UnitViewResponse> {
    return this.service.getUnitView(companyId, unitId);
  }
}
