import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CalendarRepository } from '../repository/calendar.repository';
import { ScopeResolverService } from '../../authorization/scope-resolver/scope-resolver.service';
import { PermissionScope } from '../../authorization/scope-resolver/scope-resolver.types';
import { validateDateRange } from '../domain/calendar.domain';
import { expandRecurrence, RecurrencePattern } from '../domain/recurrence.domain';
import { CreateCalendarEventDto } from '../dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from '../dto/update-calendar-event.dto';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CreateEventTypeDto, UpdateEventTypeDto } from '../dto/create-event-type.dto';

export type RecurrenceDeleteMode = 'single' | 'future' | 'all';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: CalendarRepository,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  // ─── Events ─────────────────────────────────────────────────────────────

  /**
   * Get events with scope-based filtering.
   * The effectiveScope is attached to the request by AuthorizationGuard.
   */
  async getEvents(actorUserId: string, companyId: string, query: CalendarQueryDto, effectiveScope?: PermissionScope) {
    // Resolve authorized user IDs based on scope
    const scope = effectiveScope ?? PermissionScope.OWN;
    const authorizedUserIds = await this.scopeResolver.getUserIdsInScope(scope, actorUserId, companyId);

    // Intersect with filter params if provided
    let filteredUserIds = authorizedUserIds;
    if (query.userIds && query.userIds.length > 0) {
      filteredUserIds = authorizedUserIds.filter((id) => query.userIds!.includes(id));
    }

    if (filteredUserIds.length === 0) {
      return [];
    }

    const events = await this.repository.findEvents({
      companyId,
      startDate: query.startDate,
      endDate: query.endDate,
      ownerUserIds: filteredUserIds,
      eventTypeIds: query.eventTypeIds,
      includePersonal: query.includePersonal,
      actorUserId,
      includeCancelled: query.includeCancelled,
    });

    // Filter out cancelled leave requests unless explicitly included
    if (!query.includeCancelled) {
      return events.filter((event: any) => {
        if (event.leaveRequest && event.leaveRequest.status === 'CANCELLED') {
          return false;
        }
        return true;
      });
    }

    return events;
  }

  /**
   * Returns the accessible scope (teams/users) the actor can see on the calendar.
   */
  async getAccessibleScope(actorUserId: string, companyId: string, effectiveScope?: PermissionScope) {
    const scope = effectiveScope ?? PermissionScope.OWN;
    const userIds = await this.scopeResolver.getUserIdsInScope(scope, actorUserId, companyId);
    return { userIds, scope };
  }

  /**
   * Create a calendar event.
   */
  async createEvent(actorUserId: string, companyId: string, dto: CreateCalendarEventDto) {
    // Validate date range
    validateDateRange(dto.startDate, dto.endDate);

    // Check event type exists and is not archived
    const eventType = await this.repository.findEventTypeById(companyId, dto.eventTypeId);
    if (!eventType) {
      throw new NotFoundException('Event type not found');
    }
    if (eventType.archivedAt) {
      throw new UnprocessableEntityException('Type is archived');
    }

    // Create the master event
    const event = await this.repository.createEvent({
      companyId,
      ownerUserId: actorUserId,
      eventTypeId: dto.eventTypeId,
      title: dto.title,
      startDate: dto.startDate,
      endDate: dto.endDate,
      allDay: dto.allDay,
      visibility: dto.visibility,
      notes: dto.notes,
      isRecurring: dto.isRecurring,
      recurrenceFrequency: dto.recurrenceFrequency,
      recurrenceDaysOfWeek: dto.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: dto.recurrenceDayOfMonth,
      recurrenceEndDate: dto.recurrenceEndDate,
      recurrenceCount: dto.recurrenceCount,
    });

    // If recurring, materialize instances
    if (dto.isRecurring && dto.recurrenceFrequency) {
      const pattern: RecurrencePattern = {
        frequency: dto.recurrenceFrequency,
        daysOfWeek: dto.recurrenceDaysOfWeek,
        dayOfMonth: dto.recurrenceDayOfMonth,
        endDate: dto.recurrenceEndDate,
        count: dto.recurrenceCount,
      };

      const instanceDates = expandRecurrence(pattern, dto.startDate);
      const eventDuration = dto.endDate.getTime() - dto.startDate.getTime();

      for (const instanceStart of instanceDates) {
        const instanceEnd = new Date(instanceStart.getTime() + eventDuration);
        await this.repository.createEvent({
          companyId,
          ownerUserId: actorUserId,
          eventTypeId: dto.eventTypeId,
          title: dto.title,
          startDate: instanceStart,
          endDate: instanceEnd,
          allDay: dto.allDay,
          visibility: dto.visibility,
          notes: dto.notes,
          isRecurring: false,
          recurrenceMasterId: event.id,
        });
      }
    }

    return event;
  }

  /**
   * Update a calendar event.
   */
  async updateEvent(actorUserId: string, companyId: string, eventId: string, dto: UpdateCalendarEventDto) {
    const event = await this.repository.findEventById(companyId, eventId);
    if (!event) {
      throw new NotFoundException('Not found');
    }

    // Reject editing leave-linked events
    if ((event as any).leaveRequest) {
      throw new UnprocessableEntityException('Cannot directly edit leave events');
    }

    // Validate date range if both dates are being updated
    if (dto.startDate && dto.endDate) {
      validateDateRange(dto.startDate, dto.endDate);
    } else if (dto.startDate && !dto.endDate) {
      validateDateRange(dto.startDate, event.endDate);
    } else if (!dto.startDate && dto.endDate) {
      validateDateRange(event.startDate, dto.endDate);
    }

    // Check event type if being changed
    if (dto.eventTypeId) {
      const eventType = await this.repository.findEventTypeById(companyId, dto.eventTypeId);
      if (!eventType) {
        throw new NotFoundException('Event type not found');
      }
      if (eventType.archivedAt) {
        throw new UnprocessableEntityException('Type is archived');
      }
    }

    const updated = await this.repository.updateEvent(eventId, dto);

    return updated;
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(actorUserId: string, companyId: string, eventId: string, deleteMode?: RecurrenceDeleteMode) {
    const event = await this.repository.findEventById(companyId, eventId);
    if (!event) {
      throw new NotFoundException('Not found');
    }

    // Reject deleting leave-linked events
    if ((event as any).leaveRequest) {
      throw new UnprocessableEntityException('Cannot directly delete leave events');
    }

    if (event.isRecurring && deleteMode === 'all') {
      await this.repository.deleteRecurrenceInstances(eventId);
      await this.repository.deleteEvent(eventId);
    } else if (event.isRecurring && deleteMode === 'future') {
      await this.repository.deleteFutureRecurrenceInstances(
        event.recurrenceMasterId || eventId,
        event.startDate,
      );
      await this.repository.deleteEvent(eventId);
    } else {
      await this.repository.deleteEvent(eventId);
    }
  }

  // ─── Event Types ────────────────────────────────────────────────────────

  async getEventTypes(companyId: string, includeArchived = false) {
    return this.repository.findEventTypes(companyId, includeArchived);
  }

  async createEventType(companyId: string, dto: CreateEventTypeDto) {
    try {
      const result = await this.repository.createEventType({
        companyId,
        name: dto.name,
        color: dto.color,
        icon: dto.icon ?? undefined,
        description: dto.description ?? undefined,
      });

      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Name already exists');
      }
      throw error;
    }
  }

  async updateEventType(companyId: string, eventTypeId: string, dto: UpdateEventTypeDto) {
    const existing = await this.repository.findEventTypeById(companyId, eventTypeId);
    if (!existing) {
      throw new NotFoundException('Event type not found');
    }

    try {
      const updated = await this.repository.updateEventType(eventTypeId, dto);
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Name already exists');
      }
      throw error;
    }
  }

  async archiveEventType(companyId: string, eventTypeId: string) {
    const existing = await this.repository.findEventTypeById(companyId, eventTypeId);
    if (!existing) {
      throw new NotFoundException('Event type not found');
    }

    await this.repository.updateEventType(eventTypeId, { archivedAt: new Date() });
  }

  // ─── Team Availability ──────────────────────────────────────────────────

  async getTeamAvailability(actorUserId: string, companyId: string, startDate: Date, endDate: Date, effectiveScope?: PermissionScope) {
    const scope = effectiveScope ?? PermissionScope.DIRECT_REPORTS;
    const teamUserIds = await this.scopeResolver.getUserIdsInScope(scope, actorUserId, companyId);
    const totalMembers = teamUserIds.length;

    // Get all approved leave in the date range
    const leaveRequests = await this.prisma.calendarLeaveRequest.findMany({
      where: {
        status: 'APPROVED',
        calendarEvent: {
          companyId,
          ownerUserId: { in: teamUserIds },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      },
      include: { calendarEvent: { select: { ownerUserId: true, startDate: true, endDate: true } } },
    });

    // Build daily availability
    const availability: Array<{ date: string; available: number; total: number; onLeave: number }> = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const onLeaveSet = new Set<string>();
      for (const lr of leaveRequests) {
        const evtStart = new Date(lr.calendarEvent.startDate);
        const evtEnd = new Date(lr.calendarEvent.endDate);
        if (current >= evtStart && current < evtEnd) {
          onLeaveSet.add(lr.calendarEvent.ownerUserId);
        }
      }

      availability.push({
        date: current.toISOString().split('T')[0],
        available: totalMembers - onLeaveSet.size,
        total: totalMembers,
        onLeave: onLeaveSet.size,
      });

      current.setDate(current.getDate() + 1);
    }

    return availability;
  }
}
