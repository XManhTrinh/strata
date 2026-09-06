import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CalendarRepository } from '../repository/calendar.repository';
import { CreateAccrualPolicyDto, UpdateAccrualPolicyDto } from '../dto/create-accrual-policy.dto';
import { calculateAvailableBalance } from '../domain/calendar.domain';

@Injectable()
export class AccrualService {
  private readonly logger = new Logger(AccrualService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: CalendarRepository,
  ) {}

  // ─── Monthly Accrual Processing ────────────────────────────────────────

  /**
   * Process monthly accrual for all companies with active policies.
   * Called by the accrual worker on the 1st of each month.
   */
  async processMonthlyAccrualAll() {
    // Get all active policies grouped by company
    const policies = await this.prisma.accrualPolicy.findMany({
      where: { isActive: true },
      include: { leaveType: true },
    });

    const companiesProcessed = new Set<string>();

    for (const policy of policies) {
      try {
        await this.processAccrualForPolicy(policy);
        companiesProcessed.add(policy.companyId);
      } catch (error) {
        this.logger.error(`Failed to process accrual for policy ${policy.id}: ${error}`);
      }
    }

    return { companiesProcessed: companiesProcessed.size, policiesProcessed: policies.length };
  }

  /**
   * Process monthly accrual for a specific company.
   */
  async processMonthlyAccrual(companyId: string) {
    const policies = await this.repository.findAccrualPolicies(companyId, true);

    for (const policy of policies) {
      await this.processAccrualForPolicy(policy);
    }
  }

  private async processAccrualForPolicy(policy: any) {
    const year = new Date().getFullYear();
    const companyUsers = await this.repository.findCompanyUsers(policy.companyId);

    for (const user of companyUsers) {
      try {
        // Ensure balance exists
        const balance = await this.repository.findBalance(
          policy.companyId,
          user.userId,
          policy.leaveTypeId,
          year,
        );

        if (!balance) {
          // Create initial balance
          await this.repository.upsertBalance({
            companyId: policy.companyId,
            userId: user.userId,
            leaveTypeId: policy.leaveTypeId,
            year,
            allocated: Number(policy.monthlyAccrual),
          });
          continue;
        }

        // Check cap
        const currentAllocated = Number(balance.allocated);
        const currentCarriedOver = Number(balance.carriedOver);
        const maxAccumulation = policy.maxAccumulation ? Number(policy.maxAccumulation) : null;

        const newAllocated = currentAllocated + Number(policy.monthlyAccrual);

        if (maxAccumulation !== null) {
          const totalWithCarryOver = newAllocated + currentCarriedOver;
          if (totalWithCarryOver > maxAccumulation) {
            // Cap at maxAccumulation
            const cappedAllocated = maxAccumulation - currentCarriedOver;
            if (cappedAllocated > currentAllocated) {
              await this.repository.incrementBalanceAllocated(
                policy.companyId,
                user.userId,
                policy.leaveTypeId,
                year,
                cappedAllocated - currentAllocated,
              );
            }
            continue;
          }
        }

        // Increment allocated
        await this.repository.incrementBalanceAllocated(
          policy.companyId,
          user.userId,
          policy.leaveTypeId,
          year,
          Number(policy.monthlyAccrual),
        );
      } catch (error) {
        this.logger.warn(`Failed to accrue for user ${user.userId}, policy ${policy.id}: ${error}`);
      }
    }
  }

  // ─── Year-End Carry-Over ────────────────────────────────────────────────

  /**
   * Process year-end carry-over for all leave types with carryOver=true.
   */
  async processYearEndCarryOver(companyId: string, fromYear: number) {
    const toYear = fromYear + 1;
    const leaveTypes = await this.repository.findLeaveTypes(companyId);

    for (const lt of leaveTypes) {
      const balances = await this.repository.findAllBalancesForPolicy(companyId, lt.id, fromYear);

      for (const balance of balances) {
        const available = calculateAvailableBalance(
          Number(balance.allocated),
          Number(balance.carriedOver),
          Number(balance.adjustment),
          Number(balance.used),
        );

        let carryOver = 0;
        if (lt.carryOver && available > 0) {
          const maxCarry = lt.maxCarryOverDays ? Number(lt.maxCarryOverDays) : Infinity;
          carryOver = Math.min(available, maxCarry);
        }

        // Create or update balance for the new year
        await this.repository.upsertBalance({
          companyId,
          userId: balance.userId,
          leaveTypeId: lt.id,
          year: toYear,
          allocated: Number(lt.defaultAllocation),
          carriedOver: carryOver,
        });
      }
    }
  }

  // ─── Accrual Policy CRUD ────────────────────────────────────────────────

  async getAccrualPolicies(companyId: string) {
    return this.repository.findAccrualPolicies(companyId);
  }

  async createAccrualPolicy(companyId: string, dto: CreateAccrualPolicyDto) {
    // Verify leave type exists
    const leaveType = await this.repository.findLeaveTypeById(companyId, dto.leaveTypeId);
    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    try {
      const result = await this.repository.createAccrualPolicy({
        companyId,
        leaveTypeId: dto.leaveTypeId,
        monthlyAccrual: dto.monthlyAccrual,
        maxAccumulation: dto.maxAccumulation,
        isActive: dto.isActive,
      });

      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('An accrual policy already exists for this leave type');
      }
      throw error;
    }
  }

  async updateAccrualPolicy(companyId: string, policyId: string, dto: UpdateAccrualPolicyDto) {
    const existing = await this.repository.findAccrualPolicyById(companyId, policyId);
    if (!existing) {
      throw new NotFoundException('Accrual policy not found');
    }

    const updated = await this.repository.updateAccrualPolicy(policyId, dto);

    return updated;
  }

  async deleteAccrualPolicy(companyId: string, policyId: string) {
    const existing = await this.repository.findAccrualPolicyById(companyId, policyId);
    if (!existing) {
      throw new NotFoundException('Accrual policy not found');
    }

    await this.repository.deleteAccrualPolicy(policyId);
  }
}
