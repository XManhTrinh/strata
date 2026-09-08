import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@strata/database';

// ─── DTOs ───────────────────────────────────────────────────────────────────────

export interface UpsertAllocationDto {
  membershipId: string;
  orgUnitId: string;
  fiscalYear: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  p7: number;
  p8: number;
  p9: number;
  p10: number;
  p11: number;
  p12: number;
}

export interface CreateRateCardDto {
  division: string;
  location: string;
  grade: string;
  annualCost: number;
}

export interface SquadCapacitySummary {
  orgUnitId: string;
  orgUnitName: string;
  parentName: string | null;
  breadcrumb: string[]; // full path: ["Division", "Cluster", "Tribe", "Squad"]
  members: MemberAllocation[];
  totals: PeriodValues;
  fteTotals: PeriodValues;
  permCount: number;
  subConCount: number;
}

export interface MemberAllocation {
  membershipId: string;
  fullName: string;
  email: string;
  employmentType: string | null;
  grade: string | null;
  location: string | null;
  division: string | null;
  position: string | null;
  dayRate: number | null;
  annualCost: number | null; // computed from rate card or dayRate×228
  allocations: PeriodValues;
  monthlyCost: PeriodValues; // FTE × (annualCost / 12)
}

export interface PeriodValues {
  p1: number; p2: number; p3: number; p4: number;
  p5: number; p6: number; p7: number; p8: number;
  p9: number; p10: number; p11: number; p12: number;
}

const PERIOD_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'] as const;

function zeroPeriods(): PeriodValues {
  return { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, p10: 0, p11: 0, p12: 0 };
}

// ─── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  constructor(private readonly prisma: PrismaClient) {}

  // ─── Allocations ──────────────────────────────────────────────────────────

  /**
   * Get all allocations for a company/fiscal year, optionally filtered by org unit.
   */
  async getAllocations(companyId: string, fiscalYear: number, orgUnitId?: string) {
    return this.prisma.capacityAllocation.findMany({
      where: {
        companyId,
        fiscalYear,
        ...(orgUnitId ? { orgUnitId } : {}),
      },
      include: {
        membership: {
          include: {
            position: true,
            careerLevel: true,
          },
        },
        orgUnit: { include: { parent: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Bulk upsert allocations — the "Save" endpoint.
   * Accepts an array of allocation rows and upserts them all in a transaction.
   */
  async bulkUpsertAllocations(companyId: string, allocations: UpsertAllocationDto[]) {
    const results = await this.prisma.$transaction(
      allocations.map((a) =>
        this.prisma.capacityAllocation.upsert({
          where: {
            companyId_membershipId_orgUnitId_fiscalYear: {
              companyId,
              membershipId: a.membershipId,
              orgUnitId: a.orgUnitId,
              fiscalYear: a.fiscalYear,
            },
          },
          create: {
            companyId,
            membershipId: a.membershipId,
            orgUnitId: a.orgUnitId,
            fiscalYear: a.fiscalYear,
            p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4,
            p5: a.p5, p6: a.p6, p7: a.p7, p8: a.p8,
            p9: a.p9, p10: a.p10, p11: a.p11, p12: a.p12,
          },
          update: {
            p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4,
            p5: a.p5, p6: a.p6, p7: a.p7, p8: a.p8,
            p9: a.p9, p10: a.p10, p11: a.p11, p12: a.p12,
          },
        }),
      ),
    );
    return { upserted: results.length };
  }

  /**
   * Auto-create default allocations (1.0 FTE all periods) for a member.
   * Called during CSV import.
   */
  async createDefaultAllocation(
    companyId: string,
    membershipId: string,
    orgUnitId: string,
    fiscalYear?: number,
    fte: number = 1,
  ) {
    const year = fiscalYear ?? new Date().getFullYear();
    try {
      await this.prisma.capacityAllocation.upsert({
        where: {
          companyId_membershipId_orgUnitId_fiscalYear: {
            companyId,
            membershipId,
            orgUnitId,
            fiscalYear: year,
          },
        },
        create: {
          companyId,
          membershipId,
          orgUnitId,
          fiscalYear: year,
          p1: fte, p2: fte, p3: fte, p4: fte,
          p5: fte, p6: fte, p7: fte, p8: fte,
          p9: fte, p10: fte, p11: fte, p12: fte,
        },
        update: {}, // Don't overwrite existing allocations
      });
    } catch (error) {
      this.logger.warn(`Failed to create default allocation: ${error}`);
    }
  }

  // ─── Aggregation (Squad Summary) ──────────────────────────────────────────

  /**
   * Returns squad-level capacity summary with member-level detail.
   * Computes FTE totals and cost per period using rate cards or day rates.
   */
  async getSquadSummary(
    companyId: string,
    fiscalYear: number,
    orgUnitId?: string,
  ): Promise<SquadCapacitySummary[]> {
    // Fetch allocations with member + org unit data
    const allocations = await this.prisma.capacityAllocation.findMany({
      where: {
        companyId,
        fiscalYear,
        ...(orgUnitId ? { orgUnitId } : {}),
      },
      include: {
        membership: {
          include: {
            position: true,
            careerLevel: true,
          },
        },
        orgUnit: { include: { parent: true, type: true } },
      },
    });

    // Fetch all rate cards for cost lookup
    const rateCards = await this.prisma.rateCard.findMany({
      where: { companyId },
    });
    const rateCardMap = new Map<string, number>();
    for (const rc of rateCards) {
      const key = `${rc.division}|${rc.location}|${rc.grade}`.toLowerCase();
      rateCardMap.set(key, Number(rc.annualCost));
    }

    // Fetch user data (name, email) for each membership
    const membershipIds = [...new Set(allocations.map((a) => a.membershipId))];
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { id: { in: membershipIds } },
      include: {
        position: true,
        careerLevel: true,
      },
    });

    // Get user info via userId
    const userIds = memberships.map((m) => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const membershipMap = new Map(memberships.map((m) => [m.id, m]));

    // Fetch all org units for breadcrumb resolution
    const allOrgUnits = await this.prisma.organizationUnit.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });
    const orgUnitNameMap = new Map(allOrgUnits.map((u) => [u.id, u.name]));

    // Group by org unit
    const squadMap = new Map<string, typeof allocations>();
    for (const alloc of allocations) {
      const key = alloc.orgUnitId;
      if (!squadMap.has(key)) squadMap.set(key, []);
      squadMap.get(key)!.push(alloc);
    }

    const summaries: SquadCapacitySummary[] = [];

    for (const [unitId, unitAllocations] of squadMap) {
      const orgUnit = unitAllocations[0].orgUnit;
      const fteTotals = zeroPeriods();
      const costTotals = zeroPeriods();
      let permCount = 0;
      let subConCount = 0;

      const memberAllocations: MemberAllocation[] = [];

      for (const alloc of unitAllocations) {
        const membership = membershipMap.get(alloc.membershipId);
        if (!membership) continue;

        const user = userMap.get(membership.userId);
        const person = user?.person;
        const metadata = (membership.metadata as Record<string, string>) ?? {};
        const division = metadata['Division'] ?? null;
        const location = metadata['Location'] ?? null;
        const grade = membership.careerLevel?.label ?? metadata['Grade'] ?? null;
        const employmentType = membership.employmentType;

        // Compute annual cost
        let annualCost: number | null = null;
        if (employmentType === 'SubCon' && membership.dayRate) {
          annualCost = Number(membership.dayRate) * 228;
        } else if (employmentType === 'Perm') {
          // Try rate card first
          if (division && location && grade) {
            const rcKey = `${division}|${location}|${grade}`.toLowerCase();
            const rcCost = rateCardMap.get(rcKey);
            if (rcCost) annualCost = rcCost;
          }
          // Fall back to salary
          if (!annualCost && membership.annualSalary) {
            annualCost = Number(membership.annualSalary);
          }
        }

        if (employmentType === 'Perm') permCount++;
        if (employmentType === 'SubCon') subConCount++;

        const allocPeriods: PeriodValues = {
          p1: Number(alloc.p1), p2: Number(alloc.p2), p3: Number(alloc.p3), p4: Number(alloc.p4),
          p5: Number(alloc.p5), p6: Number(alloc.p6), p7: Number(alloc.p7), p8: Number(alloc.p8),
          p9: Number(alloc.p9), p10: Number(alloc.p10), p11: Number(alloc.p11), p12: Number(alloc.p12),
        };

        const monthlyCostPeriods = zeroPeriods();
        const monthlyCostBase = annualCost ? annualCost / 12 : 0;

        for (const pk of PERIOD_KEYS) {
          const fte = allocPeriods[pk];
          fteTotals[pk] += fte;
          const cost = fte * monthlyCostBase;
          monthlyCostPeriods[pk] = Math.round(cost);
          costTotals[pk] += Math.round(cost);
        }

        memberAllocations.push({
          membershipId: alloc.membershipId,
          fullName: person?.fullName ?? 'Unknown',
          email: person?.email ?? user?.email ?? '',
          employmentType,
          grade,
          location,
          division,
          position: membership.position?.name ?? null,
          dayRate: membership.dayRate ? Number(membership.dayRate) : null,
          annualCost,
          allocations: allocPeriods,
          monthlyCost: monthlyCostPeriods,
        });
      }

      // Build breadcrumb from materialized path
      const pathIds = (orgUnit.path ?? "/")
        .split("/")
        .filter((id: string) => id.length > 0);
      const breadcrumb = pathIds
        .map((id: string) => orgUnitNameMap.get(id) ?? id)
        .concat(orgUnit.name);
      // Deduplicate last entry if path includes self
      if (breadcrumb.length > 1 && breadcrumb[breadcrumb.length - 1] === breadcrumb[breadcrumb.length - 2]) {
        breadcrumb.pop();
      }

      summaries.push({
        orgUnitId: unitId,
        orgUnitName: orgUnit.name,
        parentName: orgUnit.parent?.name ?? null,
        breadcrumb,
        members: memberAllocations,
        totals: costTotals,
        fteTotals,
        permCount,
        subConCount,
      });
    }

    return summaries.sort((a, b) => a.orgUnitName.localeCompare(b.orgUnitName));
  }

  // ─── Rate Cards ───────────────────────────────────────────────────────────

  async getRateCards(companyId: string) {
    return this.prisma.rateCard.findMany({
      where: { companyId },
      orderBy: [{ division: 'asc' }, { location: 'asc' }, { grade: 'asc' }],
    });
  }

  async upsertRateCard(companyId: string, dto: CreateRateCardDto) {
    return this.prisma.rateCard.upsert({
      where: {
        companyId_division_location_grade: {
          companyId,
          division: dto.division,
          location: dto.location,
          grade: dto.grade,
        },
      },
      create: {
        companyId,
        division: dto.division,
        location: dto.location,
        grade: dto.grade,
        annualCost: dto.annualCost,
      },
      update: {
        annualCost: dto.annualCost,
      },
    });
  }

  async bulkUpsertRateCards(companyId: string, cards: CreateRateCardDto[]) {
    const results = await this.prisma.$transaction(
      cards.map((c) =>
        this.prisma.rateCard.upsert({
          where: {
            companyId_division_location_grade: {
              companyId,
              division: c.division,
              location: c.location,
              grade: c.grade,
            },
          },
          create: { companyId, ...c },
          update: { annualCost: c.annualCost },
        }),
      ),
    );
    return { upserted: results.length };
  }

  async deleteRateCard(companyId: string, id: string) {
    const card = await this.prisma.rateCard.findFirst({
      where: { id, companyId },
    });
    if (!card) throw new NotFoundException('Rate card not found');
    return this.prisma.rateCard.delete({ where: { id } });
  }
}
