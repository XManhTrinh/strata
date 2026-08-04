import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { CreateAllocationDtoSchema } from './dto/create-allocation.dto';
import { UpdateAllocationDtoSchema } from './dto/update-allocation.dto';
import type { CreateAllocationDto } from './dto/create-allocation.dto';
import type { UpdateAllocationDto } from './dto/update-allocation.dto';

export class CapacityDomain {
  // ─── Allocation Validation ────────────────────────────────────────────────

  validateCreateAllocation(data: unknown): CreateAllocationDto {
    const result = CreateAllocationDtoSchema.safeParse(data);
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

  validateUpdateAllocation(data: unknown): UpdateAllocationDto {
    const result = UpdateAllocationDtoSchema.safeParse(data);
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

  // ─── Percentage Bounds Validation ─────────────────────────────────────────

  /**
   * Validates that a percentage value is an integer between 1 and 100 inclusive.
   * The Zod schema handles this, but this provides an explicit domain-level check
   * for use in computed scenarios.
   */
  validatePercentageBounds(percentage: number): void {
    if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'percentage',
            message: 'Percentage must be an integer between 1 and 100 inclusive',
          },
        ],
      });
    }
  }

  // ─── Total Capacity Constraint ────────────────────────────────────────────

  /**
   * Validates that the total capacity allocation for an employee does not exceed 100%.
   *
   * @param currentTotal - Sum of current allocations for the employee (excluding the one being updated if applicable)
   * @param newPercentage - The new percentage being added or updated to
   * @throws UnprocessableEntityException if the total would exceed 100%
   */
  validateTotalCapacity(currentTotal: number, newPercentage: number): void {
    const projectedTotal = currentTotal + newPercentage;
    if (projectedTotal > 100) {
      throw new UnprocessableEntityException({
        message: 'Total capacity allocation exceeded',
        details: [
          {
            field: 'percentage',
            message: `Adding ${newPercentage}% would bring total to ${projectedTotal}%, which exceeds the 100% maximum. Current total: ${currentTotal}%, remaining: ${100 - currentTotal}%`,
          },
        ],
      });
    }
  }
}
