import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { BudgetingDomain } from './budgeting.domain';
import { BudgetingRepository } from './budgeting.repository';

@Injectable()
export class BudgetingService {
  constructor(
    private readonly domain: BudgetingDomain,
    private readonly repository: BudgetingRepository,
    private readonly prisma: PrismaClient,
  ) {}

  // ─── Budget CRUD ──────────────────────────────────────────────────────────

  async createBudget(body: unknown, userId: string) {
    const validated = this.domain.validateCreateBudget(body);

    // Validate department exists
    const departmentExists = await this.repository.departmentExists(validated.departmentId);
    if (!departmentExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'departmentId',
            message: `Department with id "${validated.departmentId}" does not exist`,
          },
        ],
      });
    }

    const budget = await this.repository.createBudget(validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Budget', budget.id, 'CREATE', {
      after: budget,
    });

    return budget;
  }

  async findBudgets(departmentId?: string, fiscalPeriod?: string) {
    return this.repository.findBudgets(departmentId, fiscalPeriod);
  }

  async findBudgetById(id: string) {
    return this.repository.findBudgetById(id);
  }

  async updateBudget(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateBudget(body);

    const existing = await this.repository.findBudgetById(id);

    // If departmentId is changing, validate new department exists
    if (validated.departmentId !== undefined && validated.departmentId !== existing.departmentId) {
      const departmentExists = await this.repository.departmentExists(validated.departmentId);
      if (!departmentExists) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'departmentId',
              message: `Department with id "${validated.departmentId}" does not exist`,
            },
          ],
        });
      }
    }

    const updated = await this.repository.updateBudget(id, validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Budget', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteBudget(id: string, userId: string) {
    const existing = await this.repository.findBudgetById(id);

    const result = await this.repository.deleteBudget(id);

    // Create audit record
    await this.createAuditRecord(userId, 'Budget', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Variance Query ───────────────────────────────────────────────────────

  async getBudgetVariance(id: string) {
    const budget = await this.repository.findBudgetById(id);

    const actualSpend = await this.repository.calculateActualSpend(
      budget.departmentId,
      budget.fiscalPeriod,
    );

    const budgetedAmount = Number(budget.amount);
    const variance = this.domain.calculateVariance(budgetedAmount, actualSpend);

    return {
      id: budget.id,
      departmentId: budget.departmentId,
      fiscalPeriod: budget.fiscalPeriod,
      ...variance,
    };
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
