import { Injectable, Logger } from '@nestjs/common';
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
  annualCost: number | null; // sum of the applied rate card cost across periods
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
    // When scoped to an org unit, include ALL descendant units too — members are
    // allocated at the deepest (squad) level, so a division scope must match the
    // division and everything beneath it. Imported units don't populate `path`,
    // so descendants are derived by walking parentId.
    let scopedUnitIds: string[] | undefined;
    if (orgUnitId) {
      scopedUnitIds = await this.getSubtreeUnitIds(companyId, orgUnitId);
    }

    // Fetch allocations with membership + position + careerLevel + org unit in one query.
    const allocations = await this.prisma.capacityAllocation.findMany({
      where: {
        companyId,
        fiscalYear,
        ...(scopedUnitIds ? { orgUnitId: { in: scopedUnitIds } } : {}),
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
    });

    // Member costs come from the rate-card "apply" snapshot (membership.appliedCost),
    // set on the rate-cards page. Falls back to salary / dayRate×228 when unset.

    // Fetch user data (name, email) once for all memberships — batched, not N+1
    const userIds = [...new Set(allocations.map((a) => a.membership.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Fetch org unit id→name map for breadcrumb resolution (lightweight — id + name only)
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
        const membership = alloc.membership;
        if (!membership) continue;

        const user = userMap.get(membership.userId);
        const person = user?.person;
        const metadata = (membership.metadata as Record<string, string>) ?? {};
        const division = metadata['Division'] ?? null;
        const location = metadata['Location'] ?? null;
        const grade = membership.careerLevel?.label ?? metadata['Grade'] ?? null;
        const employmentType = membership.employmentType;

        if (employmentType === 'Perm') permCount++;
        if (employmentType === 'SubCon') subConCount++;

        const allocPeriods: PeriodValues = {
          p1: Number(alloc.p1), p2: Number(alloc.p2), p3: Number(alloc.p3), p4: Number(alloc.p4),
          p5: Number(alloc.p5), p6: Number(alloc.p6), p7: Number(alloc.p7), p8: Number(alloc.p8),
          p9: Number(alloc.p9), p10: Number(alloc.p10), p11: Number(alloc.p11), p12: Number(alloc.p12),
        };

        // Per-period monthly cost (at 1.0 FTE), then scaled by FTE per period.
        const monthlyCostPeriods = zeroPeriods();
        const perPeriodBase = this.resolveMemberPeriodCost(membership);

        let annualCost = 0;
        for (const pk of PERIOD_KEYS) {
          const fte = allocPeriods[pk];
          fteTotals[pk] += fte;
          annualCost += perPeriodBase[pk];
          const cost = fte * perPeriodBase[pk];
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

  /**
   * Returns the given org unit id plus all descendant unit ids (the full
   * subtree), derived by walking parentId across the company's units. Used to
   * scope the capacity summary to a division and everything beneath it.
   */
  private async getSubtreeUnitIds(
    companyId: string,
    rootUnitId: string,
  ): Promise<string[]> {
    const units = await this.prisma.organizationUnit.findMany({
      where: { companyId },
      select: { id: true, parentId: true },
    });
    const childrenByParent = new Map<string, string[]>();
    for (const u of units) {
      if (!u.parentId) continue;
      if (!childrenByParent.has(u.parentId)) childrenByParent.set(u.parentId, []);
      childrenByParent.get(u.parentId)!.push(u.id);
    }
    const result: string[] = [];
    const queue = [rootUnitId];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
      for (const child of childrenByParent.get(id) ?? []) queue.push(child);
    }
    return result;
  }

  /**
   * Resolve a member's monthly cost per period (at 1.0 FTE).
   *
   * Comes solely from the rate-card "apply" snapshot (membership.appliedCost, a
   * { p1..p12 } monthly map derived from the card's Q1–Q4 figures). Members with
   * no applied rate card contribute zero cost — there is no salary/day-rate
   * heuristic; cost is a rate-card concept.
   */
  private resolveMemberPeriodCost(membership: {
    appliedCost: Prisma.JsonValue | null;
  }): PeriodValues {
    const applied = membership.appliedCost as Partial<
      Record<(typeof PERIOD_KEYS)[number], number>
    > | null;
    const periods = zeroPeriods();
    if (applied && typeof applied === 'object') {
      for (const pk of PERIOD_KEYS) {
        const v = Number(applied[pk] ?? 0);
        periods[pk] = isFinite(v) ? v : 0;
      }
    }
    return periods;
  }
}
