import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { LeaveService } from '../services/leave.service';
import { SubmitLeaveRequestSchema } from '../dto/submit-leave-request.dto';
import { ScopeResolverService } from '../../authorization/scope-resolver/scope-resolver.service';

@Controller('companies/:companyId/calendar/leave-requests')
@UseGuards(AuthGuard, AuthorizationGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  @Get()
  @RequireFeaturePermission('calendar', 'view_own')
  async getLeaveRequests(
    @Param('companyId') companyId: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const effectiveScope = (req as any).effectiveScope;

    // Resolve user IDs in scope
    const authorizedUserIds = await this.scopeResolver.getUserIdsInScope(
      effectiveScope,
      user.sub,
      companyId,
    );

    return this.leaveService.getLeaveRequests(
      companyId,
      authorizedUserIds,
      query.status as string | undefined,
      query.leaveTypeIds ? (Array.isArray(query.leaveTypeIds) ? query.leaveTypeIds : [query.leaveTypeIds]) : undefined,
    );
  }

  @Post()
  @RequireFeaturePermission('calendar', 'submit_leave')
  async submitRequest(
    @Param('companyId') companyId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    const parsed = SubmitLeaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Reject recurrence on leave requests
    if (body.isRecurring || body.recurrenceFrequency) {
      throw new BadRequestException('Leave requests cannot be recurring');
    }

    return this.leaveService.submitRequest(user.sub, companyId, parsed.data);
  }

  @Post(':id/approve')
  @RequireFeaturePermission('calendar', 'approve_leave')
  async approveRequest(
    @Param('companyId') companyId: string,
    @Param('id') requestId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.leaveService.approveRequest(user.sub, companyId, requestId, body?.notes);
  }

  @Post(':id/reject')
  @RequireFeaturePermission('calendar', 'approve_leave')
  async rejectRequest(
    @Param('companyId') companyId: string,
    @Param('id') requestId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.leaveService.rejectRequest(user.sub, companyId, requestId, body?.notes);
  }

  @Post(':id/cancel')
  @RequireFeaturePermission('calendar', 'submit_leave')
  async cancelRequest(
    @Param('companyId') companyId: string,
    @Param('id') requestId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.leaveService.cancelRequest(user.sub, companyId, requestId);
  }
}
