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
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { CalendarService } from '../services/calendar.service';
import { CreateEventTypeSchema, UpdateEventTypeSchema } from '../dto/create-event-type.dto';

@Controller('api/v2/companies/:companyId/calendar/event-types')
@UseGuards(AuthGuard, AuthorizationGuard)
export class EventTypeController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @RequireFeaturePermission('calendar', 'view_own')
  async getEventTypes(
    @Param('companyId') companyId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.calendarService.getEventTypes(companyId, includeArchived === 'true');
  }

  @Post()
  @RequireFeaturePermission('calendar', 'manage_event_types')
  async createEventType(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    const parsed = CreateEventTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.calendarService.createEventType(companyId, parsed.data);
  }

  @Patch(':id')
  @RequireFeaturePermission('calendar', 'manage_event_types')
  async updateEventType(
    @Param('companyId') companyId: string,
    @Param('id') eventTypeId: string,
    @Body() body: any,
  ) {
    const parsed = UpdateEventTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.calendarService.updateEventType(companyId, eventTypeId, parsed.data);
  }

  @Delete(':id')
  @RequireFeaturePermission('calendar', 'manage_event_types')
  async archiveEventType(
    @Param('companyId') companyId: string,
    @Param('id') eventTypeId: string,
  ) {
    await this.calendarService.archiveEventType(companyId, eventTypeId);
    return { success: true };
  }
}
