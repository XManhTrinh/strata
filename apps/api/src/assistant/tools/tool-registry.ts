import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { RateCardsService } from '../../rate-cards/rate-cards.service';
import { CompanyPeopleService } from '../../people/company-people.service';
import { AuthorizationEngine } from '../../authorization/authorization.engine';
import type { AssistantTool, LlmToolDefinition } from '../assistant.types';
import { createRateCardTools } from './rate-card-tools';
import { createPeopleTools } from './people-tools';
import { zodToJsonSchema } from './zod-to-json-schema';

/**
 * Catalog of the read-only tools the assistant may call. Tools are looked up by
 * name; unknown names return undefined so the service can refuse them. The
 * registry also emits the LLM-facing function declarations.
 */
@Injectable()
export class ToolRegistry {
  private readonly tools: Map<string, AssistantTool>;

  constructor(
    rateCards: RateCardsService,
    people: CompanyPeopleService,
    prisma: PrismaClient,
    engine: AuthorizationEngine,
  ) {
    const all: AssistantTool[] = [
      ...createRateCardTools(rateCards),
      ...createPeopleTools(people, prisma, engine),
    ];
    this.tools = new Map(all.map((t) => [t.name, t]));
  }

  get(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }

  /** Function declarations for the LLM (read tools only in this phase). */
  definitions(): LlmToolDefinition[] {
    return [...this.tools.values()]
      .filter((t) => t.mode === 'read')
      .map((t) => ({
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.parameters),
      }));
  }
}
