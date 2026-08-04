import { BadRequestException } from '@nestjs/common';
import { CreateLeaveDtoSchema } from './dto/create-leave.dto';
import { UpdateLeaveDtoSchema } from './dto/update-leave.dto';
import { TransitionLeaveStatusDtoSchema } from './dto/transition-leave-status.dto';
import type { CreateLeaveDto } from './dto/create-leave.dto';
import type { UpdateLeaveDto } from './dto/update-leave.dto';
import type { TransitionLeaveStatusDto } from './dto/transition-leave-status.dto';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * Valid leave status transitions:
 * - PENDING → APPROVED
 * - PENDING → REJECTED
 * - APPROVED → CANCELLED
 * All other transitions are invalid.
 */
const VALID_TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  status: LeaveStatus;
}

export class LeaveDomain {
  // ─── Create Leave Validation ──────────────────────────────────────────────

  validateCreateLeave(data: unknown): CreateLeaveDto {
    const result = CreateLeaveDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  // ─── Update Leave Validation ──────────────────────────────────────────────

  validateUpdateLeave(data: unknown): UpdateLeaveDto {
    const result = UpdateLeaveDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'body',
            message: 'At least one field must be provided for update',
          },
        ],
      });
    }
    return result.data;
  }

  // ─── Status Transition Validation ─────────────────────────────────────────

  validateTransitionPayload(data: unknown): TransitionLeaveStatusDto {
    const result = TransitionLeaveStatusDtoSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  /**
   * Validates a leave status transition against the state machine.
   * Throws with valid transitions list in error if invalid.
   */
  validateStatusTransition(currentStatus: LeaveStatus, newStatus: LeaveStatus): void {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException({
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        details: [
          {
            field: 'status',
            message: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
          },
        ],
      });
    }
  }

  // ─── Date Validation ──────────────────────────────────────────────────────

  /**
   * Validates that endDate >= startDate and both are valid dates.
   */
  validateDates(startDate: string, endDate: string): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'startDate', message: 'startDate must be a valid date' }],
      });
    }

    if (isNaN(end.getTime())) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'endDate', message: 'endDate must be a valid date' }],
      });
    }

    if (end < start) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'endDate', message: 'endDate must be greater than or equal to startDate' }],
      });
    }

    return { start, end };
  }

  // ─── Overlap Detection ────────────────────────────────────────────────────

  /**
   * Detects if a new leave request overlaps with any approved leave requests
   * for the same employee. Two date ranges overlap if:
   *   newStart <= existingEnd AND newEnd >= existingStart
   */
  detectOverlap(
    startDate: Date,
    endDate: Date,
    approvedRequests: LeaveRequestRecord[],
  ): LeaveRequestRecord | null {
    for (const request of approvedRequests) {
      const existingStart = new Date(request.startDate);
      const existingEnd = new Date(request.endDate);

      if (startDate <= existingEnd && endDate >= existingStart) {
        return request;
      }
    }
    return null;
  }
}
