import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { BudgetingService } from './budgeting.service';

@Controller('budgets')
export class BudgetingController {
  constructor(private readonly budgetingService: BudgetingService) {}

  // ─── Budget Endpoints ─────────────────────────────────────────────────────

  @Post()
  async createBudget(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.budgetingService.createBudget(body, userId);
  }

  @Get()
  async findBudgets(
    @Query('departmentId') departmentId?: string,
    @Query('fiscalPeriod') fiscalPeriod?: string,
  ) {
    return this.budgetingService.findBudgets(departmentId, fiscalPeriod);
  }

  @Get(':id')
  async findBudgetById(@Param('id') id: string) {
    return this.budgetingService.findBudgetById(id);
  }

  @Put(':id')
  async updateBudget(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.budgetingService.updateBudget(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteBudget(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.budgetingService.deleteBudget(id, userId);
  }

  // ─── Variance Endpoint ────────────────────────────────────────────────────

  @Get(':id/variance')
  async getBudgetVariance(@Param('id') id: string) {
    return this.budgetingService.getBudgetVariance(id);
  }
}
