import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { CalendarService, RecurrenceDeleteMode } from '../services/calendar.service';
import { CreateCalendarEventSchema, CreateCalendarEventDto } from '../dto/create-calendar-event.dto';
import { UpdateCalendarEventSchema, UpdateCalendarEventDto } from '../dto/update-calendar-event.dto';
import { CalendarQuerySchema } from '../dto/calendar-query.dto';

@Controller('companies/:companyId/calendar')
@UseGuards(AuthGuard, AuthorizationGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  @RequireFeaturePermission('calendar', 'view_own')
  async getEvents(
    @Param('companyId') companyId: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const effectiveScope = (req as any).effectiveScope;

    // Parse query params
    const parsed = CalendarQuerySchema.safeParse({
      startDate: query.startDate,
      endDate: query.endDate,
      userIds: query.userIds ? (Array.isArray(query.userIds) ? query.userIds : [query.userIds]) : undefined,
      orgUnitIds: query.orgUnitIds ? (Array.isArray(query.orgUnitIds) ? query.orgUnitIds : [query.orgUnitIds]) : undefined,
      eventTypeIds: query.eventTypeIds ? (Array.isArray(query.eventTypeIds) ? query.eventTypeIds : [query.eventTypeIds]) : undefined,
      leaveTypeIds: query.leaveTypeIds ? (Array.isArray(query.leaveTypeIds) ? query.leaveTypeIds : [query.leaveTypeIds]) : undefined,
      includePersonal: query.includePersonal === 'true',
      includeCancelled: query.includeCancelled === 'true',
    });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.calendarService.getEvents(user.sub, companyId, parsed.data, effectiveScope);
  }

  @Get('accessible-scope')
  @RequireFeaturePermission('calendar', 'view_own')
  async getAccessibleScope(
    @Param('companyId') companyId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const effectiveScope = (req as any).effectiveScope;
    return this.calendarService.getAccessibleScope(user.sub, companyId, effectiveScope);
  }

  @Post('events')
  @RequireFeaturePermission('calendar', 'view_own')
  async createEvent(
    @Param('companyId') companyId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    const parsed = CreateCalendarEventSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.calendarService.createEvent(user.sub, companyId, parsed.data);
  }

  @Patch('events/:id')
  @RequireFeaturePermission('calendar', 'view_own')
  async updateEvent(
    @Param('companyId') companyId: string,
    @Param('id') eventId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    const parsed = UpdateCalendarEventSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.calendarService.updateEvent(user.sub, companyId, eventId, parsed.data);
  }

  @Delete('events/:id')
  @RequireFeaturePermission('calendar', 'view_own')
  async deleteEvent(
    @Param('companyId') companyId: string,
    @Param('id') eventId: string,
    @Query('deleteMode') deleteMode: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const mode = (deleteMode as RecurrenceDeleteMode) || undefined;
    await this.calendarService.deleteEvent(user.sub, companyId, eventId, mode);
    return { success: true };
  }

  @Get('availability')
  @RequireFeaturePermission('calendar', 'view_team')
  async getTeamAvailability(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const effectiveScope = (req as any).effectiveScope;

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    return this.calendarService.getTeamAvailability(
      user.sub,
      companyId,
      new Date(startDate),
      new Date(endDate),
      effectiveScope,
    );
  }
}
