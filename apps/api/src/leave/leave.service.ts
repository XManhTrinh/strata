import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { LeaveDomain } from './leave.domain';
import { LeaveRepository } from './leave.repository';

@Injectable()
export class LeaveService {
  constructor(
    private readonly domain: LeaveDomain,
    private readonly repository: LeaveRepository,
    private readonly prisma: PrismaClient,
  ) {}

  // ─── Leave Request CRUD ───────────────────────────────────────────────────

  async createLeaveRequest(body: unknown, userId: string) {
    const validated = this.domain.validateCreateLeave(body);

    // Validate employee exists
    const employeeExists = await this.repository.employeeExists(validated.employeeId);
    if (!employeeExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'employeeId',
            message: `Employee with id "${validated.employeeId}" does not exist`,
          },
        ],
      });
    }

    // Validate dates
    const { start, end } = this.domain.validateDates(validated.startDate, validated.endDate);

    // Check for overlap with approved leave
    const approvedRequests = await this.repository.findApprovedLeaveForEmployee(validated.employeeId);
    const overlapping = this.domain.detectOverlap(start, end, approvedRequests as any);
    if (overlapping) {
      throw new ConflictException({
        message: 'Leave request overlaps with an existing approved leave request',
        details: [
          {
            field: 'dateRange',
            message: `Overlaps with approved leave request "${overlapping.id}" (${new Date(overlapping.startDate).toISOString()} - ${new Date(overlapping.endDate).toISOString()})`,
          },
        ],
      });
    }

    const leaveRequest = await this.repository.createLeaveRequest({
      ...validated,
      startDate: start,
      endDate: end,
    } as any);

    // Create audit record
    await this.createAuditRecord(userId, 'LeaveRequest', leaveRequest.id, 'CREATE', {
      after: leaveRequest,
    });

    // Trigger notification for manager
    await this.notifyManager(validated.employeeId, leaveRequest.id);

    return leaveRequest;
  }

  async findLeaveRequests(filters: {
    employeeId?: string;
    status?: string;
    type?: string;
  }) {
    return this.repository.findLeaveRequests(filters);
  }

  async findLeaveRequestById(id: string) {
    return this.repository.findLeaveRequestById(id);
  }

  async transitionStatus(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateTransitionPayload(body);
    const existing = await this.repository.findLeaveRequestById(id);

    // Validate the status transition
    this.domain.validateStatusTransition(existing.status as any, validated.status as any);

    const updated = await this.repository.updateLeaveRequestStatus(id, validated.status);

    // Create audit record
    await this.createAuditRecord(userId, 'LeaveRequest', id, 'UPDATE', {
      before: { status: existing.status },
      after: { status: updated.status },
    });

    return updated;
  }

  async deleteLeaveRequest(id: string, userId: string) {
    const existing = await this.repository.findLeaveRequestById(id);
    const result = await this.repository.deleteLeaveRequest(id);

    // Create audit record
    await this.createAuditRecord(userId, 'LeaveRequest', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Notification ─────────────────────────────────────────────────────────

  /**
   * Creates a notification record for the employee's manager (if found)
   * when a leave request is submitted.
   */
  private async notifyManager(employeeId: string, leaveRequestId: string) {
    try {
      const managerUserId = await this.repository.findManagerUserIdForEmployee(employeeId);
      if (managerUserId) {
        await this.prisma.notification.create({
          data: {
            userId: managerUserId,
            message: `New leave request submitted (ID: ${leaveRequestId})`,
            type: 'LEAVE_REQUEST',
            priority: 'NORMAL',
          },
        });
      }
    } catch {
      // Notification failure should not block the leave request creation
      // In production, this would log to an error tracking service
    }
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  private async createAuditRecord(
    userId: string,
    entityType: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    diff: Record<string, unknown>,
  ) {
    await this.prisma.auditRecord.create({
      data: {
        userId,
        entityType,
        entityId,
        operation,
        diff: JSON.parse(JSON.stringify(diff)),
      },
    });
  }
}
