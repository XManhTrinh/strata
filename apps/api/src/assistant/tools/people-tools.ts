import { z } from 'zod';
import { PrismaClient } from '@strata/database';
import { CompanyPeopleService } from '../../people/company-people.service';
import { AuthorizationEngine } from '../../authorization/authorization.engine';
import { authorizeTool } from '../authz/authorize-tool';
import { redactPeople, type RedactablePerson } from '../authz/redact-people';
import type { AssistantContext, AssistantTool } from '../assistant.types';

const PEOPLE_VIEW = { feature: 'people', permission: 'view' } as const;

const MAX_PEOPLE = 100;

const listParams = z
  .object({
    search: z.string().max(200).optional(),
    limit: z.number().int().min(1).max(MAX_PEOPLE).optional(),
  })
  .strict();

const countParams = z
  .object({
    search: z.string().max(200).optional(),
  })
  .strict();

/**
 * Read-only people tools. Each re-evaluates the caller's scope (so compensation
 * redaction matches the caller's authorization) and redacts salary/cost fields
 * BEFORE returning — the raw data never leaves this function unredacted.
 */
export function createPeopleTools(
  people: CompanyPeopleService,
  prisma: PrismaClient,
  engine: AuthorizationEngine,
): AssistantTool[] {
  // Shared: run the list query, then redact compensation per the caller's scope.
  const listAndRedact = async (
    ctx: AssistantContext,
    opts: { search?: string; pageSize: number },
  ) => {
    const auth = await authorizeTool(engine, ctx, {
      requiredPermission: PEOPLE_VIEW,
    } as AssistantTool);
    const result = await people.findAll(ctx.companyId, {
      page: 1,
      pageSize: opts.pageSize,
      search: opts.search,
    });
    const redacted = await redactPeople(
      prisma,
      ctx,
      result.data as unknown as RedactablePerson[],
      auth.scope,
    );
    return { ...result, data: redacted };
  };

  return [
    {
      name: 'list_people',
      description:
        'List people (company members) with their name, position, org unit, employment type, roles, and — only where you are permitted — compensation (salary/day rate/annual cost). Supports an optional name/email search.',
      parameters: listParams,
      mode: 'read',
      requiredPermission: PEOPLE_VIEW,
      run: async (ctx, args) => {
        const { search, limit } = args as z.infer<typeof listParams>;
        const result = await listAndRedact(ctx, {
          search,
          pageSize: limit ?? MAX_PEOPLE,
        });
        return {
          people: result.data,
          total: result.total,
          returned: result.data.length,
        };
      },
    },
    {
      name: 'count_people',
      description:
        'Count people (company members), optionally filtered by a name/email search. Returns just the total count.',
      parameters: countParams,
      mode: 'read',
      requiredPermission: PEOPLE_VIEW,
      run: async (ctx, args) => {
        const { search } = args as z.infer<typeof countParams>;
        // pageSize 1 is enough; we only read `total`.
        const result = await people.findAll(ctx.companyId, {
          page: 1,
          pageSize: 1,
          search,
        });
        return { total: result.total };
      },
    },
  ];
}
