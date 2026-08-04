import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { OrganizationsDomain } from './organizations.domain';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly domain: OrganizationsDomain,
    private readonly repository: OrganizationsRepository,
    private readonly prisma: PrismaClient,
  ) {}

  // ─── Department Methods ────────────────────────────────────────────────────

  async createDepartment(body: unknown, userId: string) {
    const validated = this.domain.validateCreateDepartment(body);

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: validated.organizationId },
    });
    if (!organization) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'organizationId',
            message: `Organization with id "${validated.organizationId}" does not exist`,
          },
        ],
      });
    }

    // If parentId is provided, validate it exists and belongs to the same org
    if (validated.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: validated.parentId },
      });
      if (!parent) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'parentId',
              message: `Parent department with id "${validated.parentId}" does not exist`,
            },
          ],
        });
      }
      if (parent.organizationId !== validated.organizationId) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'parentId',
              message: 'Parent department must belong to the same organization',
            },
          ],
        });
      }
    }

    // Validate depth constraint
    const allDepts = await this.repository.getAllDepartmentNodes(
      validated.organizationId,
    );
    this.domain.validateDepth(validated.parentId ?? null, allDepts);

    const department = await this.repository.createDepartment(validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Department', department.id, 'CREATE', {
      after: department,
    });

    return department;
  }

  async findAllDepartments(organizationId: string, tree?: boolean) {
    if (!organizationId) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          { field: 'organizationId', message: 'organizationId is required' },
        ],
      });
    }
    return this.repository.findDepartmentsByOrganization(organizationId, tree);
  }

  async findDepartmentById(id: string) {
    return this.repository.findDepartmentById(id);
  }

  async updateDepartment(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateDepartment(body);

    const existing = await this.repository.findDepartmentById(id);

    // If parentId is changing, validate no circular reference and depth
    if (validated.parentId !== undefined) {
      const orgId = validated.organizationId || existing.organizationId;
      const allDepts = await this.repository.getAllDepartmentNodes(orgId);

      // Detect circular reference
      this.domain.detectCircularReference(id, validated.parentId, allDepts);

      // Validate depth
      this.domain.validateDepth(validated.parentId, allDepts, id);
    }

    const updated = await this.repository.updateDepartment(id, validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Department', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteDepartment(id: string, userId: string) {
    const existing = await this.repository.findDepartmentById(id);

    // Check for active employees
    const activeEmployees =
      await this.repository.getActiveEmployeesInDepartment(id);
    this.domain.validateDeletionConstraint(activeEmployees);

    const result = await this.repository.deleteDepartment(id);

    // Create audit record
    await this.createAuditRecord(userId, 'Department', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Position Methods ─────────────────────────────────────────────────────

  async createPosition(body: unknown, userId: string) {
    const validated = this.domain.validateCreatePosition(body);

    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: validated.departmentId },
    });
    if (!department) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'departmentId',
            message: `Department with id "${validated.departmentId}" does not exist`,
          },
        ],
      });
    }

    const position = await this.repository.createPosition(validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Position', position.id, 'CREATE', {
      after: position,
    });

    return position;
  }

  async findAllPositions(departmentId?: string) {
    return this.repository.findPositions(departmentId);
  }

  async findPositionById(id: string) {
    return this.repository.findPositionById(id);
  }

  async updatePosition(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdatePosition(body);

    const existing = await this.repository.findPositionById(id);

    // If departmentId is changing, verify new department exists
    if (validated.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: validated.departmentId },
      });
      if (!department) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'departmentId',
              message: `Department with id "${validated.departmentId}" does not exist`,
            },
          ],
        });
      }
    }

    const updated = await this.repository.updatePosition(id, validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Position', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deletePosition(id: string, userId: string) {
    const existing = await this.repository.findPositionById(id);

    const result = await this.repository.deletePosition(id);

    // Create audit record
    await this.createAuditRecord(userId, 'Position', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  private async createAuditRecord(
    userId: string,
    entityType: string,
    entityId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    diff: Record<string, unknown>,
  ) {
    await this.prisma.auditRecord.create({
      data: {
        userId,
        entityType,
        entityId,
        operation,
        diff: JSON.parse(JSON.stringify(diff)),
      },
    });
  }
}
