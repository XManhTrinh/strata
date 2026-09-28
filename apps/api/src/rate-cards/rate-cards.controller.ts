import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { RateCardsService } from './rate-cards.service';

// ─── Validation Schemas ─────────────────────────────────────────────────────────

const RuleOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'STARTS_WITH',
  'ENDS_WITH',
  'CONTAINS',
  'IN',
]);

const RuleConditionSchema = z.object({
  column: z.string().min(1),
  operator: RuleOperatorSchema,
  value: z.string(),
});

const rate = z.number().finite().nonnegative().nullish();

const RateCardSchema = z.object({
  name: z.string().min(1).max(120),
  priority: z.number().int().min(0).max(10000),
  isDefault: z.boolean(),
  groupId: z.string().min(1).nullish(),
  conditions: z.array(RuleConditionSchema).max(20),
  q1DayRate: rate,
  q1WorkingDays: rate,
  q2DayRate: rate,
  q2WorkingDays: rate,
  q3DayRate: rate,
  q3WorkingDays: rate,
  q4DayRate: rate,
  q4WorkingDays: rate,
});

const RateCardGroupSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  color: z.string().max(32).nullish(),
  setId: z.string().min(1).nullish(),
});

const RateCardSetSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  color: z.string().max(32).nullish(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
});

const ApplySchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1),
});

// ─── Controller ─────────────────────────────────────────────────────────────────

@Controller('companies/:companyId/rate-cards')
export class RateCardsController {
  constructor(private readonly service: RateCardsService) {}

  @Get('available-columns')
  async getAvailableColumns(@Param('companyId') companyId: string) {
    return this.service.getAvailableColumns(companyId);
  }

  // ─── Sets (tabs) ──────────────────────────────────────────────────────────

  @Get('sets')
  async getSets(@Param('companyId') companyId: string) {
    return this.service.getSets(companyId);
  }

  @Post('sets')
  async createSet(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardSetSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.createSet(companyId, parsed.data);
  }

  @Put('sets/:id')
  async updateSet(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardSetSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.updateSet(companyId, id, parsed.data);
  }

  @Delete('sets/:id')
  async deleteSet(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteSet(companyId, id);
  }

  // ─── Demo data ────────────────────────────────────────────────────────────

  @Post('seed-demo')
  @HttpCode(HttpStatus.OK)
  async seedDemo(@Param('companyId') companyId: string) {
    return this.service.seedDemo(companyId);
  }

  // ─── Groups ─────────────────────────────────────────────────────────────

  @Get('groups')
  async getGroups(@Param('companyId') companyId: string) {
    return this.service.getGroups(companyId);
  }

  @Post('groups')
  async createGroup(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardGroupSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.createGroup(companyId, parsed.data);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardGroupSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.updateGroup(companyId, id, parsed.data);
  }

  @Delete('groups/:id')
  async deleteGroup(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteGroup(companyId, id);
  }

  // ─── Cards ──────────────────────────────────────────────────────────────

  @Get()
  async getRateCards(@Param('companyId') companyId: string) {
    return this.service.getRateCards(companyId);
  }

  @Post()
  async createRateCard(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.createRateCard(companyId, parsed.data);
  }

  @Put(':id')
  async updateRateCard(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = RateCardSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.updateRateCard(companyId, id, parsed.data);
  }

  @Delete(':id')
  async deleteRateCard(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteRateCard(companyId, id);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async apply(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = ApplySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.apply(companyId, parsed.data.cardIds);
  }
}
