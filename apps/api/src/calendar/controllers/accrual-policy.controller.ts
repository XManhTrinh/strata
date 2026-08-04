import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { AccrualService } from '../services/accrual.service';
import { CreateAccrualPolicySchema, UpdateAccrualPolicySchema } from '../dto/create-accrual-policy.dto';

@Controller('api/v2/companies/:companyId/calendar/accrual-policies')
@UseGuards(AuthGuard, AuthorizationGuard)
export class AccrualPolicyController {
  constructor(private readonly accrualService: AccrualService) {}

  @Get()
  @RequireFeaturePermission('calendar', 'manage_policies')
  async getAccrualPolicies(@Param('companyId') companyId: string) {
    return this.accrualService.getAccrualPolicies(companyId);
  }

  @Post()
  @RequireFeaturePermission('calendar', 'manage_policies')
  async createAccrualPolicy(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    const parsed = CreateAccrualPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.accrualService.createAccrualPolicy(companyId, parsed.data);
  }

  @Patch(':id')
  @RequireFeaturePermission('calendar', 'manage_policies')
  async updateAccrualPolicy(
    @Param('companyId') companyId: string,
    @Param('id') policyId: string,
    @Body() body: any,
  ) {
    const parsed = UpdateAccrualPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.accrualService.updateAccrualPolicy(companyId, policyId, parsed.data);
  }

  @Delete(':id')
  @RequireFeaturePermission('calendar', 'manage_policies')
  async deleteAccrualPolicy(
    @Param('companyId') companyId: string,
    @Param('id') policyId: string,
  ) {
    await this.accrualService.deleteAccrualPolicy(companyId, policyId);
    return { success: true };
  }
}
