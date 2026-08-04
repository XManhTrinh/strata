import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Budget CRUD ──────────────────────────────────────────────────────────

  async createBudget(data: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        departmentId: data.departmentId,
        fiscalPeriod: data.fiscalPeriod,
        amount: data.amount,
      },
    });
  }

  async findBudgetById(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });
    if (!budget) {
      throw new NotFoundException(`Budget with id "${id}" not found`);
    }
    return budget;
  }

  async findBudgets(departmentId?: string, fiscalPeriod?: string) {
    const where: Record<string, unknown> = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (fiscalPeriod) {
      where.fiscalPeriod = fiscalPeriod;
    }
    return this.prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBudget(id: string, data: UpdateBudgetDto) {
    await this.findBudgetById(id);

    const updateData: Record<string, unknown> = {};
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.fiscalPeriod !== undefined) updateData.fiscalPeriod = data.fiscalPeriod;
    if (data.amount !== undefined) updateData.amount = data.amount;

    return this.prisma.budget.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteBudget(id: string) {
    await this.findBudgetById(id);
    await this.prisma.budget.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Existence Checks ─────────────────────────────────────────────────────

  async departmentExists(id: string): Promise<boolean> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!department;
  }

  // ─── Actual Spend Calculation ─────────────────────────────────────────────

  /**
   * Calculates the actual spend for a department during a fiscal period.
   * For now, since there's no compensation field on the Employee model,
   * this returns 0 as a placeholder for future implementation.
   */
  async calculateActualSpend(_departmentId: string, _fiscalPeriod: string): Promise<number> {
    // Placeholder: When compensation field is added to Employee model,
    // this will sum compensation of all active employees in the department
    // for the given fiscal period.
    return 0;
  }
}
