import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveTypeSchema, UpdateLeaveTypeSchema } from '../dto/create-leave-type.dto';

@Controller('companies/:companyId/calendar/leave-types')
@UseGuards(AuthGuard, AuthorizationGuard)
export class LeaveTypeController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @RequireFeaturePermission('calendar', 'read')
  async getLeaveTypes(
    @Param('companyId') companyId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.leaveService.getLeaveTypes(companyId, includeArchived === 'true');
  }

  @Post()
  @RequireFeaturePermission('calendar', 'approve')
  async createLeaveType(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    const parsed = CreateLeaveTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.leaveService.createLeaveType(companyId, parsed.data);
  }

  @Patch(':id')
  @RequireFeaturePermission('calendar', 'approve')
  async updateLeaveType(
    @Param('companyId') companyId: string,
    @Param('id') leaveTypeId: string,
    @Body() body: any,
  ) {
    const parsed = UpdateLeaveTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.leaveService.updateLeaveType(companyId, leaveTypeId, parsed.data);
  }

  @Delete(':id')
  @RequireFeaturePermission('calendar', 'approve')
  async archiveLeaveType(
    @Param('companyId') companyId: string,
    @Param('id') leaveTypeId: string,
  ) {
    await this.leaveService.archiveLeaveType(companyId, leaveTypeId);
    return { success: true };
  }
}
