import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, AuditOperation } from '@strata/database';
import type { PaginationMeta } from '@strata/shared-types';

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAuditResult {
  data: any[];
  meta: PaginationMeta;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: string,
    entityType: string,
    entityId: string,
    operation: AuditOperation,
    diff: Record<string, unknown>,
  ) {
    return this.prisma.auditRecord.create({
      data: {
        userId,
        entityType,
        entityId,
        operation,
        diff: JSON.parse(JSON.stringify(diff)),
      },
    });
  }

  async findAll(filters: AuditFilters = {}): Promise<PaginatedAuditResult> {
    const page = Math.max(1, filters.page ?? 1);
    const rawPageSize = filters.pageSize ?? 50;
    const pageSize = Math.min(100, Math.max(1, rawPageSize));

    const where: any = {};

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    const record = await this.prisma.auditRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Audit record with id "${id}" not found`);
    }

    return record;
  }
}
