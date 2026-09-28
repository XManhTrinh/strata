import { Module } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { AuthModule } from '../auth/auth.module';
import { RateCardsModule } from '../rate-cards/rate-cards.module';
import { PeopleModule } from '../people/people.module';
import { RateCardsService } from '../rate-cards/rate-cards.service';
import { CompanyPeopleService } from '../people/company-people.service';
import { AuthorizationEngine } from '../authorization/authorization.engine';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { GeminiProvider } from './providers/gemini.provider';
import { ToolRegistry } from './tools/tool-registry';
import { LLM_PROVIDER } from './assistant.types';

/**
 * AI assistant (Phase 1, read-only). Imports the service modules whose read
 * methods the tools wrap; AuthorizationEngine comes from the global
 * AuthorizationModule. The LLM provider is bound behind the LLM_PROVIDER token
 * so it can be swapped without touching the rest of the module.
 */
@Module({
  imports: [AuthModule, RateCardsModule, PeopleModule],
  controllers: [AssistantController],
  providers: [
    GeminiProvider,
    { provide: LLM_PROVIDER, useExisting: GeminiProvider },
    {
      provide: ToolRegistry,
      useFactory: (
        rateCards: RateCardsService,
        people: CompanyPeopleService,
        prisma: PrismaClient,
        engine: AuthorizationEngine,
      ) => new ToolRegistry(rateCards, people, prisma, engine),
      inject: [RateCardsService, CompanyPeopleService, PrismaClient, AuthorizationEngine],
    },
    AssistantService,
  ],
})
export class AssistantModule {}
