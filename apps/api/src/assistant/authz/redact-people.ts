import { PrismaClient } from '@strata/database';
import { PermissionScope, SCOPE_LEVELS } from '../../authorization/scope-resolver/scope-resolver.types';
import type { AssistantContext } from '../assistant.types';

/** Minimal shape the redactor needs; matches CompanyPeopleService.MemberResponse. */
export interface RedactablePerson {
  userId: string;
  annualSalary: number | null;
  dayRate: number | null;
  annualCost: number | null;
  metadata: Record<string, string>;
  [key: string]: unknown;
}

const COMPENSATION_METADATA_KEYS = ['Annual Salary', 'Day Rate'];

/**
 * Remove compensation fields (salary, day rate, annual cost, and the
 * corresponding metadata) from people the caller is not permitted to see them
 * for — applied server-side BEFORE any data reaches the LLM.
 *
 * Visibility mirrors the org chart rule:
 *  - super admin, or a COMPANY/GLOBAL scope → sees all compensation
 *  - otherwise → sees compensation only for self and their management chain
 *    (direct and indirect reports)
 */
export async function redactPeople<T extends RedactablePerson>(
  prisma: PrismaClient,
  ctx: AssistantContext,
  people: T[],
  scope: PermissionScope | undefined,
): Promise<T[]> {
  const visibleUserIds = await resolveCompensationVisibility(prisma, ctx, scope);
  const seeAll = visibleUserIds === 'ALL';

  return people.map((p) => {
    if (seeAll || (visibleUserIds as Set<string>).has(p.userId)) {
      return p;
    }
    // Strip compensation for people the caller may not see it for.
    const metadata = { ...p.metadata };
    for (const key of COMPENSATION_METADATA_KEYS) {
      if (key in metadata) delete metadata[key];
    }
    return {
      ...p,
      annualSalary: null,
      dayRate: null,
      annualCost: null,
      metadata,
    };
  });
}

/**
 * Returns 'ALL' when the caller may see everyone's compensation, otherwise the
 * set of Prisma user ids whose compensation the caller may see (self + reports).
 */
async function resolveCompensationVisibility(
  prisma: PrismaClient,
  ctx: AssistantContext,
  scope: PermissionScope | undefined,
): Promise<'ALL' | Set<string>> {
  // Super admin sees everything.
  const membership = await prisma.userCompanyMembership.findUnique({
    where: { userId_companyId: { userId: ctx.userId, companyId: ctx.companyId } },
    select: { isSuperAdmin: true },
  });
  if (membership?.isSuperAdmin) return 'ALL';

  // Company-wide (or broader) scope sees everything.
  if (scope && SCOPE_LEVELS[scope] >= SCOPE_LEVELS[PermissionScope.COMPANY]) {
    return 'ALL';
  }

  // Otherwise: self + management chain (direct and indirect reports).
  const relationships = await prisma.reportingRelationship.findMany({
    where: { companyId: ctx.companyId },
    select: { userId: true, managerId: true },
  });
  const visible = getSubordinateIds(ctx.userId, relationships);
  visible.add(ctx.userId); // always sees own compensation
  return visible;
}

/** BFS over reporting relationships to collect all (in)direct reports of a manager. */
function getSubordinateIds(
  managerId: string,
  relationships: { userId: string; managerId: string }[],
): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const rel of relationships) {
    if (!childrenMap.has(rel.managerId)) childrenMap.set(rel.managerId, []);
    childrenMap.get(rel.managerId)!.push(rel.userId);
  }
  const result = new Set<string>();
  const queue = [managerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenMap.get(current) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}
