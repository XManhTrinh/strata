import { BadRequestException } from '@nestjs/common';
import { CreateBudgetDtoSchema } from './dto/create-budget.dto';
import { UpdateBudgetDtoSchema } from './dto/update-budget.dto';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

export interface VarianceResult {
  budgeted: number;
  actual: number;
  variance: number;
  overBudget: boolean;
}

export class BudgetingDomain {
  // ─── Create Budget Validation ─────────────────────────────────────────────

  validateCreateBudget(data: unknown): CreateBudgetDto {
    const result = CreateBudgetDtoSchema.safeParse(data);
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

  // ─── Update Budget Validation ─────────────────────────────────────────────

  validateUpdateBudget(data: unknown): UpdateBudgetDto {
    const result = UpdateBudgetDtoSchema.safeParse(data);
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

  // ─── Non-Negative Amount Validation ───────────────────────────────────────

  /**
   * Validates that a budget amount is non-negative.
   * Used for explicit domain-level checks outside of Zod schema validation.
   */
  validateNonNegativeAmount(amount: number): void {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'amount',
            message: 'Amount must be non-negative',
          },
        ],
      });
    }
  }

  // ─── Variance Calculation ─────────────────────────────────────────────────

  /**
   * Calculates budget variance.
   *
   * @param budgetedAmount - The budgeted amount
   * @param actualSpend - The actual spend (sum of compensation for active employees in department)
   * @returns VarianceResult with budgeted, actual, variance (budgeted - actual), and overBudget flag
   */
  calculateVariance(budgetedAmount: number, actualSpend: number): VarianceResult {
    const variance = budgetedAmount - actualSpend;
    return {
      budgeted: budgetedAmount,
      actual: actualSpend,
      variance,
      overBudget: actualSpend > budgetedAmount,
    };
  }
}
