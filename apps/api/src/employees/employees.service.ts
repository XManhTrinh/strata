import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { EmployeesDomain } from './employees.domain';
import { EmployeesRepository } from './employees.repository';
import type { EmployeeFilterParams } from './employees.repository';
import type { PaginationMeta } from '@strata/shared-types';

export interface PaginatedEmployeesResult {
  data: any[];
  meta: PaginationMeta;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly domain: EmployeesDomain,
    private readonly repository: EmployeesRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async create(body: unknown, userId: string) {
    const validated = this.domain.validateCreate(body);

    // Verify personId exists
    const person = await this.prisma.person.findUnique({
      where: { id: validated.personId },
    });
    if (!person) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'personId', message: `Person with id "${validated.personId}" does not exist` }],
      });
    }

    // Verify organizationId exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: validated.organizationId },
    });
    if (!organization) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'organizationId', message: `Organization with id "${validated.organizationId}" does not exist` }],
      });
    }

    // Generate UIN
    const count = await this.repository.countByOrganization(validated.organizationId);
    const uin = this.domain.generateUin(count);

    const employee = await this.repository.create({ ...validated, uin });

    // Create audit record
    await this.createAuditRecord(userId, 'Employee', employee.id, 'CREATE', {
      after: employee,
    });

    return employee;
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    departmentId?: string;
    positionId?: string;
    status?: string;
    startDateGte?: string;
    endDateLte?: string;
  }): Promise<PaginatedEmployeesResult> {
    const safePage = Math.max(1, params.page || 1);
    const safePageSize = Math.min(100, Math.max(1, params.pageSize || 20));

    const filterParams: EmployeeFilterParams = {
      page: safePage,
      pageSize: safePageSize,
      departmentId: params.departmentId,
      positionId: params.positionId,
      status: params.status,
      startDateGte: params.startDateGte,
      endDateLte: params.endDateLte,
    };

    const { data, total } = await this.repository.findMany(filterParams);

    const totalPages = Math.ceil(total / safePageSize);

    return {
      data,
      meta: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async update(id: string, body: unknown, userId: string) {
    // Check if UIN is in the payload — it's immutable
    this.domain.assertUinNotInPayload(body);

    const validated = this.domain.validateUpdate(body);

    // Get previous state for audit
    const previous = await this.repository.findById(id);
    const updated = await this.repository.update(id, validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Employee', id, 'UPDATE', {
      before: previous,
      after: updated,
    });

    return updated;
  }

  async transitionStatus(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateTransitionStatus(body);

    const employee = await this.repository.findById(id);

    // Validate the state machine transition
    this.domain.validateStatusTransition(
      employee.status as any,
      validated.status as any,
    );

    // If transitioning to TERMINATED, set endDate to current date
    const endDate = validated.status === 'TERMINATED' ? new Date() : undefined;

    const updated = await this.repository.updateStatus(id, validated.status, endDate);

    // Create audit record
    await this.createAuditRecord(userId, 'Employee', id, 'UPDATE', {
      before: employee,
      after: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    // Soft delete: transition to TERMINATED
    const employee = await this.repository.findById(id);

    if (employee.status === 'TERMINATED') {
      throw new BadRequestException({
        message: 'Employee is already terminated',
        details: [{ field: 'status', message: 'Employee is already in TERMINATED state' }],
      });
    }

    const updated = await this.repository.updateStatus(id, 'TERMINATED', new Date());

    // Create audit record
    await this.createAuditRecord(userId, 'Employee', id, 'UPDATE', {
      before: employee,
      after: updated,
    });

    return updated;
  }

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
