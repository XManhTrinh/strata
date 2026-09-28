import { z } from 'zod';
import { RateCardsService } from '../../rate-cards/rate-cards.service';
import type { AssistantContext, AssistantTool } from '../assistant.types';

const CAPACITY_VIEW = { feature: 'capacity', permission: 'view' } as const;

const emptyParams = z.object({}).strict();

/**
 * Read-only rate-card tools. Rate cards live under the "capacity" feature in
 * the feature registry, so viewing them requires capacity:view.
 */
export function createRateCardTools(rateCards: RateCardsService): AssistantTool[] {
  return [
    {
      name: 'list_rate_cards',
      description:
        'List all rate cards for the company, including their name, group, priority, matching conditions, and per-quarter day rates and working days.',
      parameters: emptyParams,
      mode: 'read',
      requiredPermission: CAPACITY_VIEW,
      run: (ctx: AssistantContext) => rateCards.getRateCards(ctx.companyId),
    },
    {
      name: 'list_rate_card_groups',
      description:
        'List the rate card groups (e.g. "Opex", "Capex") for the company, with their names, colors, and parent tab (set).',
      parameters: emptyParams,
      mode: 'read',
      requiredPermission: CAPACITY_VIEW,
      run: (ctx: AssistantContext) => rateCards.getGroups(ctx.companyId),
    },
    {
      name: 'list_rate_card_sets',
      description:
        'List the top-level rate card sets (tabs, e.g. "Digital") for the company.',
      parameters: emptyParams,
      mode: 'read',
      requiredPermission: CAPACITY_VIEW,
      run: (ctx: AssistantContext) => rateCards.getSets(ctx.companyId),
    },
  ];
}
