import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

export interface EmployeeFilterParams {
  page: number;
  pageSize: number;
  departmentId?: string;
  positionId?: string;
  status?: string;
  startDateGte?: string;
  endDateLte?: string;
}

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateEmployeeDto & { uin: string }) {
    return this.prisma.employee.create({
      data: {
        uin: data.uin,
        personId: data.personId,
        organizationId: data.organizationId,
        departmentId: data.departmentId ?? null,
        positionId: data.positionId ?? null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  async findById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with id "${id}" not found`);
    }
    return employee;
  }

  async findMany(params: EmployeeFilterParams) {
    const { page, pageSize, departmentId, positionId, status, startDateGte, endDateLte } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (positionId) {
      where.positionId = positionId;
    }
    if (status) {
      where.status = status;
    }
    if (startDateGte) {
      where.startDate = { gte: new Date(startDateGte) };
    }
    if (endDateLte) {
      where.endDate = { lte: new Date(endDateLte) };
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: UpdateEmployeeDto) {
    // Ensure the employee exists
    await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (data.personId !== undefined) updateData.personId = data.personId;
    if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.positionId !== undefined) updateData.positionId = data.positionId;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: string, endDate?: Date) {
    const updateData: Record<string, unknown> = { status };
    if (endDate) {
      updateData.endDate = endDate;
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Count employees for an organization (used for UIN generation).
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.prisma.employee.count({
      where: { organizationId },
    });
  }
}
