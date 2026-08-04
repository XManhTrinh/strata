import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { LeaveService } from './leave.service';

@Controller('leave/requests')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ─── Create Leave Request ─────────────────────────────────────────────────

  @Post()
  async createLeaveRequest(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.leaveService.createLeaveRequest(body, userId);
  }

  // ─── List Leave Requests ──────────────────────────────────────────────────

  @Get()
  async findLeaveRequests(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.leaveService.findLeaveRequests({ employeeId, status, type });
  }

  // ─── Get Leave Request By ID ──────────────────────────────────────────────

  @Get(':id')
  async findLeaveRequestById(@Param('id') id: string) {
    return this.leaveService.findLeaveRequestById(id);
  }

  // ─── Transition Leave Status ──────────────────────────────────────────────

  @Patch(':id/status')
  async transitionStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.leaveService.transitionStatus(id, body, userId);
  }

  // ─── Delete Leave Request ─────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteLeaveRequest(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.leaveService.deleteLeaveRequest(id, userId);
  }
}
