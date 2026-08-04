import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';

/**
 * Valid leave request status transitions:
 * - PENDING → APPROVED
 * - PENDING → REJECTED
 * - APPROVED → CANCELLED
 */
type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const VALID_TRANSITIONS: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Validates that the start date is strictly before the end date.
 * Throws BadRequestException if start >= end.
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new BadRequestException('Start date must be before end date');
  }
}

/**
 * Validates that the given status transition is allowed.
 * Throws UnprocessableEntityException if the transition is invalid.
 */
export function validateStatusTransition(
  currentStatus: LeaveRequestStatus,
  newStatus: LeaveRequestStatus,
): void {
  const validTargets = VALID_TRANSITIONS[currentStatus];
  if (!validTargets || !validTargets.includes(newStatus)) {
    throw new UnprocessableEntityException(
      `Invalid transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validTargets?.join(', ') || 'none'}`,
    );
  }
}

/**
 * Checks if a new date range overlaps with any existing events.
 * Returns the first overlapping event or null if no overlap exists.
 *
 * Two ranges [A, B) and [C, D) overlap if A < D and C < B.
 */
export function checkOverlap(
  existingEvents: { startDate: Date; endDate: Date }[],
  newStart: Date,
  newEnd: Date,
): { startDate: Date; endDate: Date } | null {
  for (const event of existingEvents) {
    if (newStart < event.endDate && event.startDate < newEnd) {
      return event;
    }
  }
  return null;
}

/**
 * Validates whether the available balance is sufficient for the requested amount.
 * Returns an object indicating sufficiency and any shortfall.
 */
export function validateBalanceSufficiency(
  available: number,
  requested: number,
): { sufficient: boolean; shortfall: number } {
  const shortfall = requested - available;
  return {
    sufficient: shortfall <= 0,
    shortfall: shortfall > 0 ? shortfall : 0,
  };
}

/**
 * Calculates the available leave balance using the formula:
 * available = allocated + carriedOver + adjustment - used
 */
export function calculateAvailableBalance(
  allocated: number,
  carriedOver: number,
  adjustment: number,
  used: number,
): number {
  return allocated + carriedOver + adjustment - used;
}
