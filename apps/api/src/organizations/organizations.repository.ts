import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';
import type { CreatePositionDto } from './dto/create-position.dto';
import type { UpdatePositionDto } from './dto/update-position.dto';
import type { DepartmentNode } from './organizations.domain';

const DEPT_TREE_CACHE_PREFIX = 'cache:dept:';
const DEPT_TREE_TTL_SECONDS = 600; // 10 minutes

@Injectable()
export class OrganizationsRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  // ─── Department Methods ────────────────────────────────────────────────────

  async createDepartment(data: CreateDepartmentDto) {
    const department = await this.prisma.department.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        organizationId: data.organizationId,
      },
    });

    await this.invalidateDeptTreeCache(data.organizationId);
    return department;
  }

  async findDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!department) {
      throw new NotFoundException(`Department with id "${id}" not found`);
    }
    return department;
  }

  async findDepartmentsByOrganization(
    organizationId: string,
    tree?: boolean,
  ) {
    // Try cache first for tree view
    if (tree) {
      const cached = await this.getDeptTreeCache(organizationId);
      if (cached) {
        return cached;
      }
    }

    const departments = await this.prisma.department.findMany({
      where: { organizationId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });

    if (tree) {
      const treeResult = this.buildDepartmentTree(departments);
      await this.setDeptTreeCache(organizationId, treeResult);
      return treeResult;
    }

    return departments;
  }

  async updateDepartment(id: string, data: UpdateDepartmentDto) {
    const existing = await this.findDepartmentById(id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.organizationId !== undefined)
      updateData.organizationId = data.organizationId;

    const updated = await this.prisma.department.update({
      where: { id },
      data: updateData,
    });

    await this.invalidateDeptTreeCache(existing.organizationId);
    if (
      data.organizationId &&
      data.organizationId !== existing.organizationId
    ) {
      await this.invalidateDeptTreeCache(data.organizationId);
    }

    return updated;
  }

  async deleteDepartment(id: string) {
    const existing = await this.findDepartmentById(id);

    await this.prisma.department.delete({ where: { id } });
    await this.invalidateDeptTreeCache(existing.organizationId);

    return { deleted: true, id };
  }

  /**
   * Get all departments in an organization as DepartmentNode[] for hierarchy validation.
   */
  async getAllDepartmentNodes(organizationId: string): Promise<DepartmentNode[]> {
    const departments = await this.prisma.department.findMany({
      where: { organizationId },
      select: { id: true, parentId: true },
    });
    return departments;
  }

  /**
   * Get active employees in a department (status != TERMINATED).
   */
  async getActiveEmployeesInDepartment(
    departmentId: string,
  ): Promise<Array<{ id: string; uin: string }>> {
    const employees = await this.prisma.employee.findMany({
      where: {
        departmentId,
        status: { not: 'TERMINATED' },
      },
      select: { id: true, uin: true },
    });
    return employees;
  }

  // ─── Position Methods ─────────────────────────────────────────────────────

  async createPosition(data: CreatePositionDto) {
    return this.prisma.position.create({
      data: {
        title: data.title,
        level: data.level,
        description: data.description ?? null,
        departmentId: data.departmentId,
      },
    });
  }

  async findPositionById(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });
    if (!position) {
      throw new NotFoundException(`Position with id "${id}" not found`);
    }
    return position;
  }

  async findPositions(departmentId?: string) {
    const where: Record<string, unknown> = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.prisma.position.findMany({
      where,
      orderBy: { title: 'asc' },
    });
  }

  async updatePosition(id: string, data: UpdatePositionDto) {
    await this.findPositionById(id);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.level !== undefined) updateData.level = data.level;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;

    return this.prisma.position.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePosition(id: string) {
    await this.findPositionById(id);
    await this.prisma.position.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Cache Methods ────────────────────────────────────────────────────────

  private async getDeptTreeCache(organizationId: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(
        `${DEPT_TREE_CACHE_PREFIX}${organizationId}`,
      );
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Cache miss or error, continue without cache
    }
    return null;
  }

  private async setDeptTreeCache(
    organizationId: string,
    data: any,
  ): Promise<void> {
    try {
      await this.redis.set(
        `${DEPT_TREE_CACHE_PREFIX}${organizationId}`,
        JSON.stringify(data),
        'EX',
        DEPT_TREE_TTL_SECONDS,
      );
    } catch {
      // Silently fail on cache write errors
    }
  }

  private async invalidateDeptTreeCache(
    organizationId: string,
  ): Promise<void> {
    try {
      await this.redis.del(`${DEPT_TREE_CACHE_PREFIX}${organizationId}`);
    } catch {
      // Silently fail on cache invalidation errors
    }
  }

  // ─── Tree Building ────────────────────────────────────────────────────────

  private buildDepartmentTree(departments: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // First pass: create nodes with children arrays
    for (const dept of departments) {
      map.set(dept.id, { ...dept, children: [] });
    }

    // Second pass: build parent-child relationships
    for (const dept of departments) {
      const node = map.get(dept.id)!;
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
