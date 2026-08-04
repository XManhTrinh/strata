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
import { CapacityService } from './capacity.service';

@Controller('capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  // ─── Allocation Endpoints ─────────────────────────────────────────────────

  @Post('allocations')
  async createAllocation(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.capacityService.createAllocation(body, userId);
  }

  @Get('allocations')
  async findAllocations(
    @Query('employeeId') employeeId?: string,
    @Query('squadId') squadId?: string,
  ) {
    return this.capacityService.findAllocations(employeeId, squadId);
  }

  @Get('allocations/:id')
  async findAllocationById(@Param('id') id: string) {
    return this.capacityService.findAllocationById(id);
  }

  @Put('allocations/:id')
  async updateAllocation(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.capacityService.updateAllocation(id, body, userId);
  }

  @Delete('allocations/:id')
  @HttpCode(HttpStatus.OK)
  async deleteAllocation(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.capacityService.deleteAllocation(id, userId);
  }

  // ─── Overview Endpoint ────────────────────────────────────────────────────

  @Get('overview/:employeeId')
  async getCapacityOverview(@Param('employeeId') employeeId: string) {
    return this.capacityService.getCapacityOverview(employeeId);
  }
}
