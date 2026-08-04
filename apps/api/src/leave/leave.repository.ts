import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreateLeaveDto } from './dto/create-leave.dto';
import type { UpdateLeaveDto } from './dto/update-leave.dto';

@Injectable()
export class LeaveRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Leave Request CRUD ───────────────────────────────────────────────────

  async createLeaveRequest(data: CreateLeaveDto & { startDate: Date; endDate: Date }) {
    return this.prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason ?? null,
        status: 'PENDING',
      },
    });
  }

  async findLeaveRequestById(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(`Leave request with id "${id}" not found`);
    }
    return request;
  }

  async findLeaveRequests(filters: {
    employeeId?: string;
    status?: string;
    type?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLeaveRequestStatus(id: string, status: string) {
    await this.findLeaveRequestById(id);
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async updateLeaveRequest(id: string, data: UpdateLeaveDto & { startDate?: Date; endDate?: Date }) {
    await this.findLeaveRequestById(id);

    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.reason !== undefined) updateData.reason = data.reason;

    return this.prisma.leaveRequest.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteLeaveRequest(id: string) {
    await this.findLeaveRequestById(id);
    await this.prisma.leaveRequest.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Overlap Detection Query ──────────────────────────────────────────────

  /**
   * Finds all APPROVED leave requests for an employee.
   * Used for overlap detection.
   */
  async findApprovedLeaveForEmployee(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
      },
    });
  }

  // ─── Existence Checks ─────────────────────────────────────────────────────

  async employeeExists(id: string): Promise<boolean> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!employee;
  }

  /**
   * Finds the manager (department head's user) for an employee.
   * Returns the userId of the manager if found, null otherwise.
   * This is a simplistic approach — finds any other employee in the same department
   * who has a User account as a "manager" placeholder.
   */
  async findManagerUserIdForEmployee(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });

    if (!employee || !employee.departmentId) {
      return null;
    }

    // Find another employee in the same department who has a user account
    // In a real system, this would use a proper manager relationship
    const managerEmployee = await this.prisma.employee.findFirst({
      where: {
        departmentId: employee.departmentId,
        id: { not: employeeId },
        person: {
          user: { isNot: null },
        },
      },
      select: {
        person: {
          select: {
            user: { select: { id: true } },
          },
        },
      },
    });

    return managerEmployee?.person?.user?.id ?? null;
  }
}
