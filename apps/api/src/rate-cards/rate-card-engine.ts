import { RateCardRuleOperator } from '@strata/database';

/**
 * Pure rate-card matching + costing engine.
 *
 * A rate card both selects members (via `conditions`) and computes their cost
 * (via per-quarter day rate × working days). Given a member's column values and
 * the company's cards, it resolves the applicable card and the member's cost for
 * each of the 12 periods (P1..P12).
 *
 * All inputs are plain data (no Prisma types), so the engine is unit-testable
 * and reusable across services.
 */

export const PERIOD_KEYS = [
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12',
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];
export type Periods = Record<PeriodKey, number>;

/** Which periods each quarter feeds (Q1 → P1-P3, etc.). */
const QUARTER_PERIODS: Record<1 | 2 | 3 | 4, PeriodKey[]> = {
  1: ['p1', 'p2', 'p3'],
  2: ['p4', 'p5', 'p6'],
  3: ['p7', 'p8', 'p9'],
  4: ['p10', 'p11', 'p12'],
};

export function zeroPeriods(): Periods {
  return {
    p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
    p7: 0, p8: 0, p9: 0, p10: 0, p11: 0, p12: 0,
  };
}

// ─── Engine input shapes (plain data) ───────────────────────────────────────

export interface EngineCondition {
  column: string;
  operator: RateCardRuleOperator;
  value: string;
}

export interface EngineCard {
  id: string;
  priority: number;
  isDefault: boolean;
  conditions: EngineCondition[];
  q1DayRate: number | null; q1WorkingDays: number | null;
  q2DayRate: number | null; q2WorkingDays: number | null;
  q3DayRate: number | null; q3WorkingDays: number | null;
  q4DayRate: number | null; q4WorkingDays: number | null;
}

export interface RateCardResolution {
  cardId: string;
  /** Monthly cost per period at 1.0 FTE. */
  periods: Periods;
  /** Annualised cost = sum of period costs. */
  annualCost: number;
}

// ─── Condition evaluation ────────────────────────────────────────────────────

function matchesCondition(
  memberValue: string | undefined,
  cond: EngineCondition,
): boolean {
  const actual = (memberValue ?? '').trim().toLowerCase();
  const expected = cond.value.trim().toLowerCase();

  switch (cond.operator) {
    case 'EQUALS':
      return actual === expected;
    case 'NOT_EQUALS':
      return actual !== expected;
    case 'STARTS_WITH':
      return actual.startsWith(expected);
    case 'ENDS_WITH':
      return actual.endsWith(expected);
    case 'CONTAINS':
      return actual.includes(expected);
    case 'IN':
      return cond.value
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .includes(actual);
    default:
      return false;
  }
}

function cardMatches(card: EngineCard, member: Record<string, string>): boolean {
  if (card.isDefault) return true;
  if (card.conditions.length === 0) return false;
  return card.conditions.every((c) => matchesCondition(member[c.column], c));
}

// ─── Cost computation ────────────────────────────────────────────────────────

/**
 * Per-period MONTHLY cost at 1.0 FTE. Each quarter's monthly cost
 * (dayRate × workingDays) fills its three periods.
 */
export function computeCardPeriods(card: EngineCard): Periods {
  const periods = zeroPeriods();
  const quarters: [1 | 2 | 3 | 4, number | null, number | null][] = [
    [1, card.q1DayRate, card.q1WorkingDays],
    [2, card.q2DayRate, card.q2WorkingDays],
    [3, card.q3DayRate, card.q3WorkingDays],
    [4, card.q4DayRate, card.q4WorkingDays],
  ];
  for (const [q, dayRate, workingDays] of quarters) {
    const monthly = (dayRate ?? 0) * (workingDays ?? 0);
    for (const pk of QUARTER_PERIODS[q]) periods[pk] = monthly;
  }
  return periods;
}

// ─── Public: resolve a member's rate ─────────────────────────────────────────

/**
 * Resolve the rate card for a member. Cards are evaluated in ascending priority;
 * the first whose conditions match wins (a default card matches anything, and is
 * only used as a fallback after non-default cards). Returns null if none match.
 *
 * When `only` is provided, only those card ids are considered (used by "apply
 * selected cards").
 */
export function resolveRateCard(
  member: Record<string, string>,
  cards: EngineCard[],
  only?: Set<string>,
): RateCardResolution | null {
  const pool = only ? cards.filter((c) => only.has(c.id)) : cards;
  const ordered = [...pool].sort((a, b) => a.priority - b.priority);

  const nonDefault = ordered.filter((c) => !c.isDefault);
  const defaults = ordered.filter((c) => c.isDefault);

  const matched =
    nonDefault.find((c) => cardMatches(c, member)) ?? defaults[0] ?? null;

  if (!matched) return null;

  const periods = computeCardPeriods(matched);
  const annualCost = PERIOD_KEYS.reduce((sum, pk) => sum + periods[pk], 0);
  return { cardId: matched.id, periods, annualCost };
}
