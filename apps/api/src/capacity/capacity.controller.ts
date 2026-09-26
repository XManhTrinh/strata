import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CapacityService } from './capacity.service';
import { z } from 'zod';

// ─── Validation Schemas ─────────────────────────────────────────────────────────

const PeriodValueSchema = z.number().min(0).max(1);

const UpsertAllocationSchema = z.object({
  membershipId: z.string().min(1),
  orgUnitId: z.string().min(1),
  fiscalYear: z.number().int().min(2020).max(2100),
  p1: PeriodValueSchema, p2: PeriodValueSchema, p3: PeriodValueSchema, p4: PeriodValueSchema,
  p5: PeriodValueSchema, p6: PeriodValueSchema, p7: PeriodValueSchema, p8: PeriodValueSchema,
  p9: PeriodValueSchema, p10: PeriodValueSchema, p11: PeriodValueSchema, p12: PeriodValueSchema,
});

const BulkAllocationsSchema = z.object({
  allocations: z.array(UpsertAllocationSchema).min(1).max(5000),
});

// ─── Controller ─────────────────────────────────────────────────────────────────

@Controller('companies/:companyId/capacity')
export class CapacityController {
  constructor(private readonly service: CapacityService) {}

  // ─── Allocations ──────────────────────────────────────────────────────────

  /**
   * GET /companies/:companyId/capacity/allocations?fiscalYear=2026&orgUnitId=xxx
   * Returns raw allocation rows.
   */
  @Get('allocations')
  async getAllocations(
    @Param('companyId') companyId: string,
    @Query('fiscalYear') fiscalYearStr: string,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    const fiscalYear = parseInt(fiscalYearStr, 10);
    if (isNaN(fiscalYear)) {
      throw new BadRequestException('fiscalYear query param is required');
    }
    return this.service.getAllocations(companyId, fiscalYear, orgUnitId);
  }

  /**
   * PUT /companies/:companyId/capacity/allocations
   * Bulk upsert allocations (the "Save" endpoint).
   */
  @Put('allocations')
  @HttpCode(HttpStatus.OK)
  async bulkUpsertAllocations(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = BulkAllocationsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.bulkUpsertAllocations(companyId, parsed.data.allocations);
  }

  // ─── Squad Summary (aggregated view) ──────────────────────────────────────

  /**
   * GET /companies/:companyId/capacity/summary?fiscalYear=2026&orgUnitId=xxx
   * Returns squad-level capacity summary with member detail and cost.
   */
  @Get('summary')
  async getSquadSummary(
    @Param('companyId') companyId: string,
    @Query('fiscalYear') fiscalYearStr: string,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    const fiscalYear = parseInt(fiscalYearStr, 10);
    if (isNaN(fiscalYear)) {
      throw new BadRequestException('fiscalYear query param is required');
    }
    return this.service.getSquadSummary(companyId, fiscalYear, orgUnitId);
  }
}
