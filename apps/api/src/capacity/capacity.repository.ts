import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreateAllocationDto } from './dto/create-allocation.dto';
import type { UpdateAllocationDto } from './dto/update-allocation.dto';

@Injectable()
export class CapacityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Allocation CRUD ──────────────────────────────────────────────────────

  async createAllocation(data: CreateAllocationDto) {
    return this.prisma.capacityAllocation.create({
      data: {
        employeeId: data.employeeId,
        squadId: data.squadId,
        percentage: data.percentage,
      },
    });
  }

  async findAllocationById(id: string) {
    const allocation = await this.prisma.capacityAllocation.findUnique({
      where: { id },
    });
    if (!allocation) {
      throw new NotFoundException(`Capacity allocation with id "${id}" not found`);
    }
    return allocation;
  }

  async findAllocations(employeeId?: string, squadId?: string) {
    const where: Record<string, unknown> = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (squadId) {
      where.squadId = squadId;
    }
    return this.prisma.capacityAllocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAllocation(id: string, data: UpdateAllocationDto) {
    await this.findAllocationById(id);

    const updateData: Record<string, unknown> = {};
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.squadId !== undefined) updateData.squadId = data.squadId;
    if (data.percentage !== undefined) updateData.percentage = data.percentage;

    return this.prisma.capacityAllocation.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteAllocation(id: string) {
    await this.findAllocationById(id);
    await this.prisma.capacityAllocation.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Capacity Queries ─────────────────────────────────────────────────────

  /**
   * Gets the total capacity allocation percentage for an employee across all squads,
   * optionally excluding a specific allocation (used during updates).
   */
  async getEmployeeTotalCapacity(employeeId: string, excludeAllocationId?: string): Promise<number> {
    const where: Record<string, unknown> = { employeeId };
    if (excludeAllocationId) {
      where.id = { not: excludeAllocationId };
    }
    const allocations = await this.prisma.capacityAllocation.findMany({
      where,
      select: { percentage: true },
    });
    return allocations.reduce((sum, a) => sum + a.percentage, 0);
  }

  /**
   * Gets all allocations for an employee (used for capacity overview).
   */
  async getEmployeeAllocations(employeeId: string) {
    return this.prisma.capacityAllocation.findMany({
      where: { employeeId },
      include: {
        squad: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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

  async squadExists(id: string): Promise<boolean> {
    const squad = await this.prisma.squad.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!squad;
  }
}
