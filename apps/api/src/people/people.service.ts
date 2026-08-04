import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { PeopleDomain } from './people.domain';
import { PeopleRepository } from './people.repository';
import type { PaginationMeta } from '@strata/shared-types';

export interface PaginatedPeopleResult {
  data: any[];
  meta: PaginationMeta;
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly domain: PeopleDomain,
    private readonly repository: PeopleRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async create(body: unknown, userId: string) {
    const validated = this.domain.validateCreate(body);
    const person = await this.repository.create(validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Person', person.id, 'CREATE', {
      after: person,
    });

    return person;
  }

  async findAll(page: number = 1, pageSize: number = 20): Promise<PaginatedPeopleResult> {
    // Clamp values
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));

    const { data, total } = await this.repository.findMany({
      page: safePage,
      pageSize: safePageSize,
    });

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
    const validated = this.domain.validateUpdate(body);

    // Get previous state for audit diff
    const previous = await this.repository.findById(id);
    const updated = await this.repository.update(id, validated);

    // Create audit record
    await this.createAuditRecord(userId, 'Person', id, 'UPDATE', {
      before: previous,
      after: updated,
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    // Get current state for audit
    const person = await this.repository.findById(id);

    const result = await this.repository.delete(id);
    if (!result.canDelete) {
      throw new BadRequestException({
        message: 'Cannot delete person with linked employees',
        details: [
          {
            field: 'id',
            message: `Person has ${result.employees.length} linked employee(s). Remove employee records first.`,
          },
        ],
      });
    }

    // Create audit record
    await this.createAuditRecord(userId, 'Person', id, 'DELETE', {
      before: person,
    });

    return { message: 'Person deleted successfully' };
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
