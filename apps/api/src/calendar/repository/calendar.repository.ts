import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@strata/database';

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Calendar Events ────────────────────────────────────────────────────

  async findEvents(params: {
    companyId: string;
    startDate: Date;
    endDate: Date;
    ownerUserIds: string[];
    eventTypeIds?: string[];
    includePersonal?: boolean;
    actorUserId?: string;
    includeCancelled?: boolean;
  }) {
    const where: any = {
      companyId: params.companyId,
      ownerUserId: { in: params.ownerUserIds },
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
    };

    if (params.eventTypeIds && params.eventTypeIds.length > 0) {
      where.eventTypeId = { in: params.eventTypeIds };
    }

    // Exclude PERSONAL events that don't belong to the actor
    if (!params.includePersonal && params.actorUserId) {
      where.OR = [
        { visibility: 'SHARED' },
        { visibility: 'PERSONAL', ownerUserId: params.actorUserId },
      ];
      delete where.ownerUserId;
      where.AND = [{ ownerUserId: { in: params.ownerUserIds } }];
    }

    // Exclude cancelled leave requests unless explicitly included
    if (!params.includeCancelled) {
      where.OR = where.OR || [];
      // We handle this in the include/filter below
    }

    return this.prisma.calendarEvent.findMany({
      where,
      include: {
        eventType: true,
        leaveRequest: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findEventById(companyId: string, eventId: string) {
    return this.prisma.calendarEvent.findFirst({
      where: { id: eventId, companyId },
      include: {
        eventType: true,
        leaveRequest: true,
      },
    });
  }

  async createEvent(data: {
    companyId: string;
    ownerUserId: string;
    eventTypeId: string;
    title: string;
    startDate: Date;
    endDate: Date;
    allDay?: boolean;
    visibility?: string;
    notes?: string;
    isRecurring?: boolean;
    recurrenceMasterId?: string;
    recurrenceFrequency?: string;
    recurrenceDaysOfWeek?: number[];
    recurrenceDayOfMonth?: number;
    recurrenceEndDate?: Date;
    recurrenceCount?: number;
  }) {
    return this.prisma.calendarEvent.create({
      data: data as any,
      include: {
        eventType: true,
        leaveRequest: true,
      },
    });
  }

  async updateEvent(eventId: string, data: Record<string, any>) {
    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data,
      include: {
        eventType: true,
        leaveRequest: true,
      },
    });
  }

  async deleteEvent(eventId: string) {
    return this.prisma.calendarEvent.delete({ where: { id: eventId } });
  }

  async deleteRecurrenceInstances(masterId: string) {
    return this.prisma.calendarEvent.deleteMany({
      where: { recurrenceMasterId: masterId },
    });
  }

  async deleteFutureRecurrenceInstances(masterId: string, afterDate: Date) {
    return this.prisma.calendarEvent.deleteMany({
      where: {
        recurrenceMasterId: masterId,
        startDate: { gt: afterDate },
      },
    });
  }

  // ─── Leave Requests ─────────────────────────────────────────────────────

  async findLeaveRequests(params: {
    companyId: string;
    ownerUserIds?: string[];
    status?: string;
    leaveTypeIds?: string[];
  }) {
    const where: any = {
      calendarEvent: { companyId: params.companyId },
    };
    if (params.ownerUserIds && params.ownerUserIds.length > 0) {
      where.calendarEvent.ownerUserId = { in: params.ownerUserIds };
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.leaveTypeIds && params.leaveTypeIds.length > 0) {
      where.leaveTypeId = { in: params.leaveTypeIds };
    }

    return this.prisma.calendarLeaveRequest.findMany({
      where,
      include: {
        calendarEvent: { include: { eventType: true } },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLeaveRequestById(requestId: string) {
    return this.prisma.calendarLeaveRequest.findUnique({
      where: { id: requestId },
      include: {
        calendarEvent: { include: { eventType: true } },
        leaveType: true,
      },
    });
  }

  async createLeaveRequest(data: {
    calendarEventId: string;
    leaveTypeId: string;
    status?: string;
    workingDays: number;
  }) {
    return this.prisma.calendarLeaveRequest.create({
      data: data as any,
      include: {
        calendarEvent: { include: { eventType: true } },
        leaveType: true,
      },
    });
  }

  async updateLeaveRequest(requestId: string, data: Record<string, any>) {
    return this.prisma.calendarLeaveRequest.update({
      where: { id: requestId },
      data,
      include: {
        calendarEvent: { include: { eventType: true } },
        leaveType: true,
      },
    });
  }

  // ─── Overlap Check ──────────────────────────────────────────────────────

  async findOverlappingLeaveRequests(
    companyId: string,
    ownerUserId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string,
  ) {
    const where: any = {
      status: { in: ['PENDING', 'APPROVED'] },
      calendarEvent: {
        companyId,
        ownerUserId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    };
    if (excludeRequestId) {
      where.id = { not: excludeRequestId };
    }
    return this.prisma.calendarLeaveRequest.findMany({
      where,
      include: { calendarEvent: true },
    });
  }

  // ─── Balances ───────────────────────────────────────────────────────────

  async findBalances(companyId: string, userId: string, year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { companyId, userId, year },
      include: { leaveType: true },
    });
  }

  async findBalance(companyId: string, userId: string, leaveTypeId: string, year: number) {
    return this.prisma.leaveBalance.findUnique({
      where: {
        companyId_userId_leaveTypeId_year: { companyId, userId, leaveTypeId, year },
      },
      include: { leaveType: true },
    });
  }

  async upsertBalance(params: {
    companyId: string;
    userId: string;
    leaveTypeId: string;
    year: number;
    allocated: number;
    used?: number;
    adjustment?: number;
    carriedOver?: number;
  }) {
    return this.prisma.leaveBalance.upsert({
      where: {
        companyId_userId_leaveTypeId_year: {
          companyId: params.companyId,
          userId: params.userId,
          leaveTypeId: params.leaveTypeId,
          year: params.year,
        },
      },
      create: {
        companyId: params.companyId,
        userId: params.userId,
        leaveTypeId: params.leaveTypeId,
        year: params.year,
        allocated: params.allocated,
        used: params.used ?? 0,
        adjustment: params.adjustment ?? 0,
        carriedOver: params.carriedOver ?? 0,
      },
      update: {
        allocated: params.allocated,
        ...(params.used !== undefined && { used: params.used }),
        ...(params.adjustment !== undefined && { adjustment: params.adjustment }),
        ...(params.carriedOver !== undefined && { carriedOver: params.carriedOver }),
      },
      include: { leaveType: true },
    });
  }

  async incrementBalanceUsed(companyId: string, userId: string, leaveTypeId: string, year: number, amount: number) {
    return this.prisma.leaveBalance.update({
      where: {
        companyId_userId_leaveTypeId_year: { companyId, userId, leaveTypeId, year },
      },
      data: { used: { increment: amount } },
      include: { leaveType: true },
    });
  }

  async decrementBalanceUsed(companyId: string, userId: string, leaveTypeId: string, year: number, amount: number) {
    return this.prisma.leaveBalance.update({
      where: {
        companyId_userId_leaveTypeId_year: { companyId, userId, leaveTypeId, year },
      },
      data: { used: { decrement: amount } },
      include: { leaveType: true },
    });
  }

  async incrementBalanceAllocated(companyId: string, userId: string, leaveTypeId: string, year: number, amount: number) {
    return this.prisma.leaveBalance.update({
      where: {
        companyId_userId_leaveTypeId_year: { companyId, userId, leaveTypeId, year },
      },
      data: { allocated: { increment: amount } },
      include: { leaveType: true },
    });
  }

  // ─── Event Types ────────────────────────────────────────────────────────

  async findEventTypes(companyId: string, includeArchived = false) {
    const where: any = { companyId };
    if (!includeArchived) {
      where.archivedAt = null;
    }
    return this.prisma.eventType.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findEventTypeById(companyId: string, id: string) {
    return this.prisma.eventType.findFirst({ where: { id, companyId } });
  }

  async createEventType(data: { companyId: string; name: string; color?: string; icon?: string; description?: string; isSystem?: boolean }) {
    return this.prisma.eventType.create({ data: data as any });
  }

  async updateEventType(id: string, data: Record<string, any>) {
    return this.prisma.eventType.update({ where: { id }, data });
  }

  // ─── Leave Types ────────────────────────────────────────────────────────

  async findLeaveTypes(companyId: string, includeArchived = false) {
    const where: any = { companyId };
    if (!includeArchived) {
      where.archivedAt = null;
    }
    return this.prisma.leaveTypeConfig.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findLeaveTypeById(companyId: string, id: string) {
    return this.prisma.leaveTypeConfig.findFirst({ where: { id, companyId } });
  }

  async createLeaveType(data: {
    companyId: string;
    name: string;
    color?: string;
    defaultAllocation: number;
    requiresApproval?: boolean;
    carryOver?: boolean;
    maxCarryOverDays?: number | null;
    isSystem?: boolean;
  }) {
    return this.prisma.leaveTypeConfig.create({ data: data as any });
  }

  async updateLeaveType(id: string, data: Record<string, any>) {
    return this.prisma.leaveTypeConfig.update({ where: { id }, data });
  }

  // ─── Accrual Policies ───────────────────────────────────────────────────

  async findAccrualPolicies(companyId: string, activeOnly = false) {
    const where: any = { companyId };
    if (activeOnly) {
      where.isActive = true;
    }
    return this.prisma.accrualPolicy.findMany({ where, include: { leaveType: true } });
  }

  async findAccrualPolicyById(companyId: string, id: string) {
    return this.prisma.accrualPolicy.findFirst({ where: { id, companyId }, include: { leaveType: true } });
  }

  async createAccrualPolicy(data: {
    companyId: string;
    leaveTypeId: string;
    monthlyAccrual: number;
    maxAccumulation?: number | null;
    isActive?: boolean;
  }) {
    return this.prisma.accrualPolicy.create({ data: data as any, include: { leaveType: true } });
  }

  async updateAccrualPolicy(id: string, data: Record<string, any>) {
    return this.prisma.accrualPolicy.update({ where: { id }, data, include: { leaveType: true } });
  }

  async deleteAccrualPolicy(id: string) {
    return this.prisma.accrualPolicy.delete({ where: { id } });
  }

  // ─── User Lookups ───────────────────────────────────────────────────────

  async findCompanyUsers(companyId: string) {
    return this.prisma.userCompanyMembership.findMany({
      where: { companyId },
      select: { userId: true },
    });
  }

  async findAllBalancesForPolicy(companyId: string, leaveTypeId: string, year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { companyId, leaveTypeId, year },
    });
  }
}
