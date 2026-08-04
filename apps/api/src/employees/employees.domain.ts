import { BadRequestException } from '@nestjs/common';
import { CreateEmployeeDtoSchema } from './dto/create-employee.dto';
import { UpdateEmployeeDtoSchema } from './dto/update-employee.dto';
import { TransitionStatusDtoSchema } from './dto/transition-status.dto';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import type { TransitionStatusDto } from './dto/transition-status.dto';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'SUSPENDED';

/**
 * Valid status transitions for the employment status state machine.
 * TERMINATED is a terminal state — no transitions allowed out of it.
 */
const VALID_TRANSITIONS: Record<EmploymentStatus, EmploymentStatus[]> = {
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'TERMINATED'],
  ON_LEAVE: ['ACTIVE', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  TERMINATED: [],
};

export class EmployeesDomain {
  /**
   * Validates a create-employee payload.
   */
  validateCreate(data: unknown): CreateEmployeeDto {
    const result = CreateEmployeeDtoSchema.safeParse(data);
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
   * Validates an update-employee payload.
   * Rejects if payload is empty.
   */
  validateUpdate(data: unknown): UpdateEmployeeDto {
    const result = UpdateEmployeeDtoSchema.safeParse(data);
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
        details: [{ field: 'body', message: 'At least one field must be provided for update' }],
      });
    }

    return result.data;
  }

  /**
   * Validates a status transition payload.
   */
  validateTransitionStatus(data: unknown): TransitionStatusDto {
    const result = TransitionStatusDtoSchema.safeParse(data);
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
   * Checks if the UIN field is present in a raw payload.
   * UIN is immutable once assigned and cannot be changed via update.
   */
  assertUinNotInPayload(data: unknown): void {
    if (data && typeof data === 'object' && 'uin' in data) {
      throw new BadRequestException({
        message: 'UIN is immutable and cannot be changed',
        details: [{ field: 'uin', message: 'UIN cannot be modified once assigned' }],
      });
    }
  }

  /**
   * Validates a status transition against the state machine.
   * Returns true if the transition is valid, throws otherwise.
   */
  validateStatusTransition(currentStatus: EmploymentStatus, newStatus: EmploymentStatus): void {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException({
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        details: [
          {
            field: 'status',
            message: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`,
          },
        ],
      });
    }
  }

  /**
   * Generates a UIN for a new employee within an organization.
   * Format: "EMP-" + 6-digit zero-padded sequential number.
   */
  generateUin(currentCount: number): string {
    const nextNumber = currentCount + 1;
    return `EMP-${nextNumber.toString().padStart(6, '0')}`;
  }
}
