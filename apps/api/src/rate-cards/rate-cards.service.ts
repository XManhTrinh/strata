import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@strata/database';
import {
  resolveRateCard,
  type EngineCard,
  type Periods,
} from './rate-card-engine';

// ─── DTOs ───────────────────────────────────────────────────────────────────────

export interface RuleCondition {
  column: string;
  operator: string; // RateCardRuleOperator value
  value: string;
}

export interface UpsertRateCardDto {
  name: string;
  priority: number;
  isDefault: boolean;
  groupId?: string | null;
  conditions: RuleCondition[];
  q1DayRate?: number | null;
  q1WorkingDays?: number | null;
  q2DayRate?: number | null;
  q2WorkingDays?: number | null;
  q3DayRate?: number | null;
  q3WorkingDays?: number | null;
  q4DayRate?: number | null;
  q4WorkingDays?: number | null;
}

export interface UpsertRateCardGroupDto {
  name: string;
  description?: string;
  color?: string | null;
  setId?: string | null;
}

export interface UpsertRateCardSetDto {
  name: string;
  description?: string;
  color?: string | null;
  displayOrder?: number;
}

export interface ApplyResult {
  matched: number;
  unmatched: number;
  total: number;
}

export interface AvailableColumn {
  column: string;
  values: string[];
}

/** Fixed typed member fields available for conditions (plus CSV metadata keys). */
const TYPED_MEMBER_COLUMNS = [
  'Full Name',
  'Position',
  'Grade',
  'Employment Type',
  'Day Rate',
  'Annual Salary',
];

const num = (v: Prisma.Decimal | null): number | null =>
  v === null || v === undefined ? null : Number(v);

const toDecimal = (v: number | null | undefined): Prisma.Decimal | null =>
  v === null || v === undefined ? null : new Prisma.Decimal(v);

@Injectable()
export class RateCardsService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────

  async getRateCards(companyId: string) {
    return this.prisma.rateCard.findMany({
      where: { companyId },
      orderBy: { priority: 'asc' },
    });
  }

  async createRateCard(companyId: string, dto: UpsertRateCardDto) {
    return this.prisma.rateCard.create({
      data: this.cardData(companyId, dto),
    });
  }

  async updateRateCard(companyId: string, id: string, dto: UpsertRateCardDto) {
    const existing = await this.prisma.rateCard.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card not found');
    return this.prisma.rateCard.update({
      where: { id },
      data: this.cardData(companyId, dto),
    });
  }

  async deleteRateCard(companyId: string, id: string) {
    const existing = await this.prisma.rateCard.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card not found');
    return this.prisma.rateCard.delete({ where: { id } });
  }

  // ─── Groups (UI-only organization) ──────────────────────────────────────────

  async getGroups(companyId: string) {
    return this.prisma.rateCardGroup.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createGroup(companyId: string, dto: UpsertRateCardGroupDto) {
    return this.prisma.rateCardGroup.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? null,
        setId: dto.setId ?? null,
      },
    });
  }

  async updateGroup(companyId: string, id: string, dto: UpsertRateCardGroupDto) {
    const existing = await this.prisma.rateCardGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card group not found');
    return this.prisma.rateCardGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? null,
        setId: dto.setId ?? null,
      },
    });
  }

  async deleteGroup(companyId: string, id: string) {
    const existing = await this.prisma.rateCardGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card group not found');
    // Cards keep existing; their groupId is set null via the relation's onDelete.
    return this.prisma.rateCardGroup.delete({ where: { id } });
  }

  // ─── Sets (UI-only tabs, one level above groups) ───────────────────────────

  async getSets(companyId: string) {
    return this.prisma.rateCardSet.findMany({
      where: { companyId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createSet(companyId: string, dto: UpsertRateCardSetDto) {
    return this.prisma.rateCardSet.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async updateSet(companyId: string, id: string, dto: UpsertRateCardSetDto) {
    const existing = await this.prisma.rateCardSet.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card set not found');
    return this.prisma.rateCardSet.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? null,
        displayOrder: dto.displayOrder ?? existing.displayOrder,
      },
    });
  }

  async deleteSet(companyId: string, id: string) {
    const existing = await this.prisma.rateCardSet.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Rate card set not found');
    // Groups keep existing; their setId is set null via the relation's onDelete.
    return this.prisma.rateCardSet.delete({ where: { id } });
  }

  // ─── Demo data ──────────────────────────────────────────────────────────────

  /**
   * Create a ready-made "Demo" set of rate cards for the company so the UI can
   * be populated quickly (mirrors the seed: a Digital-style set → Opex/Capex
   * groups → UK/Offshore × band cards). Idempotent: re-running clears and
   * recreates the demo set's cards. Everything is tagged "(Demo)" by name so
   * it's obvious this is quick sample data, not real rates.
   */
  async seedDemo(companyId: string) {
    const SET_NAME = 'Digital (Demo)';
    const GROUP_NAMES = { opex: 'Opex (Demo)', capex: 'Capex (Demo)' };
    const DEMO_DESCRIPTION = 'Quick demo data — sample rate cards for previewing the UI.';

    // Upsert the demo set (tab).
    const set = await this.prisma.rateCardSet.upsert({
      where: { companyId_name: { companyId, name: SET_NAME } },
      update: { description: DEMO_DESCRIPTION, color: '#6750A4', displayOrder: 0 },
      create: {
        companyId,
        name: SET_NAME,
        description: DEMO_DESCRIPTION,
        color: '#6750A4',
        displayOrder: 0,
      },
    });

    const groupSpecs = [
      { name: GROUP_NAMES.opex, color: '#F59E0B', capexOpex: 'Opex' },
      { name: GROUP_NAMES.capex, color: '#10B981', capexOpex: 'Capex' },
    ];

    const groupIdByName = new Map<string, string>();
    for (const g of groupSpecs) {
      const row = await this.prisma.rateCardGroup.upsert({
        where: { companyId_name: { companyId, name: g.name } },
        update: { description: DEMO_DESCRIPTION, color: g.color, setId: set.id },
        create: {
          companyId,
          name: g.name,
          description: DEMO_DESCRIPTION,
          color: g.color,
          setId: set.id,
        },
      });
      groupIdByName.set(g.name, row.id);
    }

    // Clear existing demo cards so re-runs stay clean.
    const groupIds = [...groupIdByName.values()];
    await this.prisma.rateCard.deleteMany({
      where: { companyId, groupId: { in: groupIds } },
    });

    const locations = [
      // Working days per quarter: UK = 18, AMEA (Offshore) = 19.
      { label: 'UK', geography: 'UK', workingDays: 18 },
      { label: 'Offshore', geography: 'AMEA', workingDays: 19 },
    ];
    const bandOrder = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

    // Explicit day rates per group · location · band (same across all quarters).
    // A rate of 0 means "no card for this combination" and is skipped.
    const RATES: Record<string, Record<string, Record<string, number>>> = {
      Opex: {
        UK: { A: 2731, B: 996, C: 629, D: 413, E: 265, F: 204 },
        AMEA: { A: 0, B: 962, C: 629, D: 183, E: 91, F: 0 },
      },
      Capex: {
        UK: { A: 0, B: 0, C: 690, D: 438, E: 288, F: 226 },
        AMEA: { A: 0, B: 0, C: 495, D: 198, E: 99, F: 99 },
      },
    };

    let priority = 0;
    let created = 0;
    for (const g of groupSpecs) {
      const groupId = groupIdByName.get(g.name)!;
      for (const loc of locations) {
        for (const band of bandOrder) {
          const dayRate = RATES[g.capexOpex]?.[loc.geography]?.[band] ?? 0;
          if (dayRate <= 0) continue; // no card for zero-rate combinations
          const days = loc.workingDays;
          await this.prisma.rateCard.create({
            data: {
              companyId,
              groupId,
              name: `${g.capexOpex} · ${loc.label} Band ${band} (Demo)`,
              priority: priority++,
              isDefault: false,
              conditions: [
                // Digital Rate Card principles:
                //   OUC starts with Q; Regular staff (Regular/Temporary mapped to
                //   Employment Type = "Perm"); Opex/Capex split; UK/Offshore via
                //   Work Geography; band = Grade.
                { column: 'OUC', operator: 'STARTS_WITH', value: 'Q' },
                { column: 'Employment Type', operator: 'EQUALS', value: 'Perm' },
                { column: 'Opex /Capex', operator: 'EQUALS', value: g.capexOpex },
                { column: 'Work Geography', operator: 'EQUALS', value: loc.geography },
                { column: 'Grade', operator: 'EQUALS', value: band },
              ] as unknown as Prisma.InputJsonValue,
              q1DayRate: toDecimal(dayRate), q1WorkingDays: toDecimal(days),
              q2DayRate: toDecimal(dayRate), q2WorkingDays: toDecimal(days),
              q3DayRate: toDecimal(dayRate), q3WorkingDays: toDecimal(days),
              q4DayRate: toDecimal(dayRate), q4WorkingDays: toDecimal(days),
            },
          });
          created += 1;
        }
      }
    }

    return { set: SET_NAME, groups: groupSpecs.length, cards: created };
  }

  private cardData(companyId: string, dto: UpsertRateCardDto) {
    return {
      companyId,
      name: dto.name,
      priority: dto.priority,
      isDefault: dto.isDefault,
      groupId: dto.groupId ?? null,
      conditions: dto.conditions as unknown as Prisma.InputJsonValue,
      q1DayRate: toDecimal(dto.q1DayRate),
      q1WorkingDays: toDecimal(dto.q1WorkingDays),
      q2DayRate: toDecimal(dto.q2DayRate),
      q2WorkingDays: toDecimal(dto.q2WorkingDays),
      q3DayRate: toDecimal(dto.q3DayRate),
      q3WorkingDays: toDecimal(dto.q3WorkingDays),
      q4DayRate: toDecimal(dto.q4DayRate),
      q4WorkingDays: toDecimal(dto.q4WorkingDays),
    };
  }

  // ─── Available columns ──────────────────────────────────────────────────────

  /**
   * The columns a company can write conditions against, each with the distinct
   * values seen across members (so the UI can offer value suggestions). Values
   * are capped per column to keep the payload bounded.
   */
  async getAvailableColumns(companyId: string): Promise<AvailableColumn[]> {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId },
      include: {
        position: { select: { name: true } },
        careerLevel: { select: { label: true } },
      },
    });

    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: { select: { fullName: true } } },
    });
    const personByUserId = new Map(users.map((u) => [u.id, u.person]));

    // column -> distinct values (order preserved via Set)
    const valuesByColumn = new Map<string, Set<string>>();
    const ensure = (col: string) => {
      let s = valuesByColumn.get(col);
      if (!s) {
        s = new Set<string>();
        valuesByColumn.set(col, s);
      }
      return s;
    };
    // Seed typed columns so they always appear even before any values exist.
    for (const col of TYPED_MEMBER_COLUMNS) ensure(col);

    for (const m of memberships) {
      const cols = RateCardsService.buildMemberColumns({
        metadata: m.metadata,
        employmentType: m.employmentType,
        dayRate: m.dayRate,
        annualSalary: m.annualSalary,
        position: m.position,
        careerLevel: m.careerLevel,
        person: personByUserId.get(m.userId) ?? null,
      });
      for (const [col, val] of Object.entries(cols)) {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          ensure(col).add(String(val));
        }
      }
    }

    const VALUE_CAP = 200;
    const typed = new Set(TYPED_MEMBER_COLUMNS);
    const allCols = [...valuesByColumn.keys()];
    // Typed columns first (in their fixed order), then extras alphabetically.
    const extras = allCols.filter((c) => !typed.has(c)).sort();
    const ordered = [...TYPED_MEMBER_COLUMNS.filter((c) => valuesByColumn.has(c)), ...extras];

    return ordered.map((column) => ({
      column,
      values: [...(valuesByColumn.get(column) ?? [])]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, VALUE_CAP),
    }));
  }

  // ─── Engine helpers ──────────────────────────────────────────────────────────

  private toEngineCards(
    cards: Awaited<ReturnType<RateCardsService['getRateCards']>>,
  ): EngineCard[] {
    return cards.map((c) => ({
      id: c.id,
      priority: c.priority,
      isDefault: c.isDefault,
      conditions: (c.conditions as unknown as EngineCard['conditions']) ?? [],
      q1DayRate: num(c.q1DayRate), q1WorkingDays: num(c.q1WorkingDays),
      q2DayRate: num(c.q2DayRate), q2WorkingDays: num(c.q2WorkingDays),
      q3DayRate: num(c.q3DayRate), q3WorkingDays: num(c.q3WorkingDays),
      q4DayRate: num(c.q4DayRate), q4WorkingDays: num(c.q4WorkingDays),
    }));
  }

  /** Build the column view a member exposes to rate card conditions. */
  static buildMemberColumns(m: {
    metadata: unknown;
    employmentType: string | null;
    dayRate: Prisma.Decimal | null;
    annualSalary: Prisma.Decimal | null;
    position?: { name: string } | null;
    careerLevel?: { label: string } | null;
    person?: { fullName?: string | null } | null;
  }): Record<string, string> {
    const cols: Record<string, string> = {
      ...((m.metadata as Record<string, string> | null) ?? {}),
    };
    if (m.person?.fullName) cols['Full Name'] = m.person.fullName;
    if (m.position?.name) cols['Position'] = m.position.name;
    const grade = m.careerLevel?.label ?? cols['Grade'];
    if (grade) cols['Grade'] = grade;
    if (m.employmentType) cols['Employment Type'] = m.employmentType;
    if (m.dayRate !== null && m.dayRate !== undefined) {
      cols['Day Rate'] = String(Number(m.dayRate));
    }
    if (m.annualSalary !== null && m.annualSalary !== undefined) {
      cols['Annual Salary'] = String(Number(m.annualSalary));
    }
    return cols;
  }

  // ─── Apply ───────────────────────────────────────────────────────────────────

  /**
   * Apply the selected rate cards to every membership in the company. For each
   * member, the first selected card (by priority) whose conditions match wins;
   * its computed per-period cost is snapshotted onto the membership. Members
   * matched by no selected card are left untouched.
   */
  async apply(companyId: string, cardIds: string[]): Promise<ApplyResult> {
    const cards = await this.getRateCards(companyId);
    const engineCards = this.toEngineCards(cards);
    const only = new Set(cardIds);

    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId },
      include: {
        position: { select: { name: true } },
        careerLevel: { select: { label: true } },
      },
    });

    // UserCompanyMembership has no direct `user` relation, so batch-fetch the
    // users (with person) by userId.
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: { select: { fullName: true } } },
    });
    const personByUserId = new Map(users.map((u) => [u.id, u.person]));

    const updates: Prisma.PrismaPromise<unknown>[] = [];
    let matched = 0;

    for (const m of memberships) {
      const cols = RateCardsService.buildMemberColumns({
        metadata: m.metadata,
        employmentType: m.employmentType,
        dayRate: m.dayRate,
        annualSalary: m.annualSalary,
        position: m.position,
        careerLevel: m.careerLevel,
        person: personByUserId.get(m.userId) ?? null,
      });

      const resolution = resolveRateCard(cols, engineCards, only);
      if (!resolution) continue;

      matched += 1;
      updates.push(
        this.prisma.userCompanyMembership.update({
          where: { id: m.id },
          data: {
            appliedRateCardId: resolution.cardId,
            appliedCost: resolution.periods as unknown as Prisma.InputJsonValue,
          },
        }),
      );
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }

    return {
      matched,
      unmatched: memberships.length - matched,
      total: memberships.length,
    };
  }
}

export type { Periods };
