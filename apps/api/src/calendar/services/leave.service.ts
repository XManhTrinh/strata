import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { CalendarRepository } from '../repository/calendar.repository';
import { BalanceService } from './balance.service';
import {
  validateDateRange,
  validateStatusTransition,
  checkOverlap,
  validateBalanceSufficiency,
  calculateAvailableBalance,
} from '../domain/calendar.domain';
import { calculateWorkingDays } from '../domain/working-days.domain';
import { SubmitLeaveRequestDto } from '../dto/submit-leave-request.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../dto/create-leave-type.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: CalendarRepository,
    private readonly balanceService: BalanceService,
    private readonly redis: Redis,
  ) {}

  // ─── Leave Request Workflow ─────────────────────────────────────────────

  /**
   * Submit a new leave request.
   */
  async submitRequest(actorUserId: string, companyId: string, dto: SubmitLeaveRequestDto) {
    // Validate date range
    validateDateRange(dto.startDate, dto.endDate);

    // Get leave type and validate it's not archived
    const leaveType = await this.repository.findLeaveTypeById(companyId, dto.leaveTypeId);
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }
    if (leaveType.archivedAt) {
      throw new UnprocessableEntityException('Type is archived');
    }

    // Calculate working days
    const workingDays = calculateWorkingDays(dto.startDate, dto.endDate);
    if (workingDays === 0) {
      throw new BadRequestException('Leave request must cover at least one working day');
    }

    // Check balance sufficiency
    const year = dto.startDate.getFullYear();
    const balance = await this.repository.findBalance(companyId, actorUserId, dto.leaveTypeId, year);
    if (balance) {
      const available = calculateAvailableBalance(
        Number(balance.allocated),
        Number(balance.carriedOver),
        Number(balance.adjustment),
        Number(balance.used),
      );
      const sufficiency = validateBalanceSufficiency(available, workingDays);
      if (!sufficiency.sufficient) {
        throw new UnprocessableEntityException({
          error: 'Insufficient balance',
          available,
          requested: workingDays,
          shortfall: sufficiency.shortfall,
        });
      }
    }

    // Check for overlap with existing approved/pending leave
    const overlapping = await this.repository.findOverlappingLeaveRequests(
      companyId,
      actorUserId,
      dto.startDate,
      dto.endDate,
    );
    if (overlapping.length > 0) {
      throw new ConflictException({
        error: 'Conflict',
        conflictingRequestId: overlapping[0].id,
        conflictingDates: {
          startDate: overlapping[0].calendarEvent.startDate,
          endDate: overlapping[0].calendarEvent.endDate,
        },
      });
    }

    // Find the "Leave" event type for this company (or create the event with any available type)
    const leaveEventType = await this.prisma.eventType.findFirst({
      where: { companyId, name: 'Leave', archivedAt: null },
    });
    const eventTypeId = leaveEventType?.id;
    if (!eventTypeId) {
      throw new UnprocessableEntityException('No Leave event type configured. Please enable calendar defaults.');
    }

    // Create CalendarEvent
    const calendarEvent = await this.repository.createEvent({
      companyId,
      ownerUserId: actorUserId,
      eventTypeId,
      title: `${leaveType.name} Leave`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      allDay: true,
      visibility: 'SHARED',
      notes: dto.notes,
    });

    // Determine initial status
    const initialStatus = leaveType.requiresApproval ? 'PENDING' : 'APPROVED';

    // Create LeaveRequest
    const leaveRequest = await this.repository.createLeaveRequest({
      calendarEventId: calendarEvent.id,
      leaveTypeId: dto.leaveTypeId,
      status: initialStatus,
      workingDays,
    });

    // If auto-approved, deduct balance immediately
    if (!leaveType.requiresApproval) {
      await this.balanceService.deductBalance(actorUserId, companyId, dto.leaveTypeId, workingDays);
    }

    // Enqueue notification
    await this.enqueueNotification(
      leaveType.requiresApproval ? 'leave-submitted' : 'leave-approved',
      { requestId: leaveRequest.id, userId: actorUserId, companyId },
    );

    // Audit
    await this.createAuditRecord(actorUserId, 'CalendarLeaveRequest', leaveRequest.id, 'CREATE', {
      status: initialStatus,
      leaveTypeId: dto.leaveTypeId,
      workingDays,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    return leaveRequest;
  }

  /**
   * Approve a leave request.
   */
  async approveRequest(actorUserId: string, companyId: string, requestId: string, notes?: string) {
    const request = await this.repository.findLeaveRequestById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Validate transition
    validateStatusTransition(request.status as any, 'APPROVED');

    // Deduct balance
    const ownerUserId = request.calendarEvent.ownerUserId;
    await this.balanceService.deductBalance(
      ownerUserId,
      companyId,
      request.leaveTypeId,
      Number(request.workingDays),
    );

    // Update status
    const updated = await this.repository.updateLeaveRequest(requestId, {
      status: 'APPROVED',
      reviewerId: actorUserId,
      reviewNotes: notes,
      reviewedAt: new Date(),
    });

    // Enqueue notification
    await this.enqueueNotification('leave-approved', {
      requestId,
      userId: ownerUserId,
      reviewerId: actorUserId,
      companyId,
    });

    // Audit
    await this.createAuditRecord(actorUserId, 'CalendarLeaveRequest', requestId, 'UPDATE', {
      previousStatus: request.status,
      newStatus: 'APPROVED',
      reviewNotes: notes,
    });

    return updated;
  }

  /**
   * Reject a leave request.
   */
  async rejectRequest(actorUserId: string, companyId: string, requestId: string, notes?: string) {
    const request = await this.repository.findLeaveRequestById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Validate transition
    validateStatusTransition(request.status as any, 'REJECTED');

    // Update status (no balance change)
    const updated = await this.repository.updateLeaveRequest(requestId, {
      status: 'REJECTED',
      reviewerId: actorUserId,
      reviewNotes: notes,
      reviewedAt: new Date(),
    });

    // Enqueue notification
    await this.enqueueNotification('leave-rejected', {
      requestId,
      userId: request.calendarEvent.ownerUserId,
      reviewerId: actorUserId,
      companyId,
    });

    // Audit
    await this.createAuditRecord(actorUserId, 'CalendarLeaveRequest', requestId, 'UPDATE', {
      previousStatus: request.status,
      newStatus: 'REJECTED',
      reviewNotes: notes,
    });

    return updated;
  }

  /**
   * Cancel a leave request.
   */
  async cancelRequest(actorUserId: string, companyId: string, requestId: string) {
    const request = await this.repository.findLeaveRequestById(requestId);
    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Validate transition
    validateStatusTransition(request.status as any, 'CANCELLED');

    // If was APPROVED, restore balance
    if (request.status === 'APPROVED') {
      const ownerUserId = request.calendarEvent.ownerUserId;
      await this.balanceService.restoreBalance(
        ownerUserId,
        companyId,
        request.leaveTypeId,
        Number(request.workingDays),
      );
    }

    // Update status
    const updated = await this.repository.updateLeaveRequest(requestId, {
      status: 'CANCELLED',
    });

    // Enqueue notification
    await this.enqueueNotification('leave-cancelled', {
      requestId,
      userId: request.calendarEvent.ownerUserId,
      cancelledBy: actorUserId,
      companyId,
    });

    // Audit
    await this.createAuditRecord(actorUserId, 'CalendarLeaveRequest', requestId, 'UPDATE', {
      previousStatus: request.status,
      newStatus: 'CANCELLED',
    });

    return updated;
  }

  /**
   * Get leave requests with scope filtering.
   */
  async getLeaveRequests(companyId: string, ownerUserIds?: string[], status?: string, leaveTypeIds?: string[]) {
    return this.repository.findLeaveRequests({ companyId, ownerUserIds, status, leaveTypeIds });
  }

  // ─── Leave Types ────────────────────────────────────────────────────────

  async getLeaveTypes(companyId: string, includeArchived = false) {
    return this.repository.findLeaveTypes(companyId, includeArchived);
  }

  async createLeaveType(companyId: string, dto: CreateLeaveTypeDto) {
    try {
      const result = await this.repository.createLeaveType({
        companyId,
        name: dto.name,
        color: dto.color,
        defaultAllocation: dto.defaultAllocation,
        requiresApproval: dto.requiresApproval,
        carryOver: dto.carryOver,
        maxCarryOverDays: dto.maxCarryOverDays,
      });

      await this.createAuditRecord('system', 'LeaveTypeConfig', result.id, 'CREATE', { name: dto.name });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Name already exists');
      }
      throw error;
    }
  }

  async updateLeaveType(companyId: string, leaveTypeId: string, dto: UpdateLeaveTypeDto) {
    const existing = await this.repository.findLeaveTypeById(companyId, leaveTypeId);
    if (!existing) {
      throw new NotFoundException('Leave type not found');
    }

    try {
      const updated = await this.repository.updateLeaveType(leaveTypeId, dto);
      await this.createAuditRecord('system', 'LeaveTypeConfig', leaveTypeId, 'UPDATE', { changes: dto });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Name already exists');
      }
      throw error;
    }
  }

  async archiveLeaveType(companyId: string, leaveTypeId: string) {
    const existing = await this.repository.findLeaveTypeById(companyId, leaveTypeId);
    if (!existing) {
      throw new NotFoundException('Leave type not found');
    }

    await this.repository.updateLeaveType(leaveTypeId, { archivedAt: new Date() });
    await this.createAuditRecord('system', 'LeaveTypeConfig', leaveTypeId, 'UPDATE', { archived: true });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async enqueueNotification(type: string, data: Record<string, any>) {
    try {
      const jobData = JSON.stringify({ type, data, enqueuedAt: new Date().toISOString() });
      await this.redis.lpush(
        'bull:calendar:wait',
        JSON.stringify({
          name: 'notification',
          data: jobData,
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to enqueue notification: ${error}`);
    }
  }

  private async createAuditRecord(
    userId: string,
    entityType: string,
    entityId: string,
    operation: string,
    diff: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditRecord.create({
        data: {
          userId,
          entityType,
          entityId,
          operation: operation as any,
          diff: JSON.parse(JSON.stringify(diff)),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create audit record: ${error}`);
    }
  }
}
