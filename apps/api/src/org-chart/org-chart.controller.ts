import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { OrgChartService } from './org-chart.service';
import { OrgChartPerson, OrgTreeNode, UnitViewResponse } from './org-chart.types';

@Controller('api/v2/companies/:companyId/org-chart')
@UseGuards(AuthGuard)
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get()
  async getTree(@Param('companyId') companyId: string): Promise<OrgTreeNode[]> {
    return this.service.getTree(companyId);
  }

  @Get('people')
  async getPeople(
    @Param('companyId') companyId: string,
    @Req() req: Request,
  ): Promise<OrgChartPerson[]> {
    const userId = (req as any).user?.sub ?? (req as any).user?.userId ?? '';
    return this.service.getPeople(companyId, userId);
  }

  @Get('unit/:unitId')
  async getUnitView(
    @Param('companyId') companyId: string,
    @Param('unitId') unitId: string,
  ): Promise<UnitViewResponse> {
    return this.service.getUnitView(companyId, unitId);
  }
}
