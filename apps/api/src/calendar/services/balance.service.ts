import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CalendarRepository } from '../repository/calendar.repository';
import { calculateAvailableBalance } from '../domain/calendar.domain';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: CalendarRepository,
  ) {}

  /**
   * Get all leave balances for a user in a given year.
   */
  async getBalances(userId: string, companyId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const balances = await this.repository.findBalances(companyId, userId, targetYear);

    return balances.map((b) => ({
      id: b.id,
      userId: b.userId,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: (b as any).leaveType?.name,
      year: b.year,
      allocated: Number(b.allocated),
      used: Number(b.used),
      adjustment: Number(b.adjustment),
      carriedOver: Number(b.carriedOver),
      available: calculateAvailableBalance(
        Number(b.allocated),
        Number(b.carriedOver),
        Number(b.adjustment),
        Number(b.used),
      ),
    }));
  }

  /**
   * Deduct from user's balance (when leave is approved).
   */
  async deductBalance(userId: string, companyId: string, leaveTypeId: string, workingDays: number) {
    const year = new Date().getFullYear();
    const balance = await this.repository.findBalance(companyId, userId, leaveTypeId, year);
    if (!balance) {
      throw new NotFoundException('Balance record not found');
    }

    const updated = await this.repository.incrementBalanceUsed(companyId, userId, leaveTypeId, year, workingDays);
    return this.formatBalance(updated);
  }

  /**
   * Restore balance (when approved leave is cancelled).
   */
  async restoreBalance(userId: string, companyId: string, leaveTypeId: string, workingDays: number) {
    const year = new Date().getFullYear();
    const balance = await this.repository.findBalance(companyId, userId, leaveTypeId, year);
    if (!balance) {
      throw new NotFoundException('Balance record not found');
    }

    const updated = await this.repository.decrementBalanceUsed(companyId, userId, leaveTypeId, year, workingDays);
    return this.formatBalance(updated);
  }

  /**
   * Manual adjustment by admin (HR).
   */
  async adjustBalance(
    adminUserId: string,
    companyId: string,
    targetUserId: string,
    dto: AdjustBalanceDto,
  ) {
    const year = new Date().getFullYear();
    const balance = await this.repository.findBalance(companyId, targetUserId, dto.leaveTypeId, year);

    if (!balance) {
      throw new NotFoundException('Balance record not found for this user and leave type');
    }

    const newAdjustment = Number(balance.adjustment) + dto.adjustment;

    const updated = await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { adjustment: newAdjustment },
      include: { leaveType: true },
    });

    return this.formatBalance(updated);
  }

  /**
   * Initialize balances for a user when they join or at year start.
   */
  async initializeBalances(companyId: string, userId: string, year: number) {
    const leaveTypes = await this.repository.findLeaveTypes(companyId);

    for (const lt of leaveTypes) {
      await this.repository.upsertBalance({
        companyId,
        userId,
        leaveTypeId: lt.id,
        year,
        allocated: Number(lt.defaultAllocation),
      });
    }
  }

  private formatBalance(balance: any) {
    return {
      id: balance.id,
      userId: balance.userId,
      leaveTypeId: balance.leaveTypeId,
      leaveTypeName: balance.leaveType?.name,
      year: balance.year,
      allocated: Number(balance.allocated),
      used: Number(balance.used),
      adjustment: Number(balance.adjustment),
      carriedOver: Number(balance.carriedOver),
      available: calculateAvailableBalance(
        Number(balance.allocated),
        Number(balance.carriedOver),
        Number(balance.adjustment),
        Number(balance.used),
      ),
    };
  }
}
