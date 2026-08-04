import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { CapacityDomain } from './capacity.domain';
import { CapacityRepository } from './capacity.repository';

const CACHE_PREFIX = 'cache:capacity:';
const CACHE_TTL_SECONDS = 120; // 2 minutes

@Injectable()
export class CapacityService {
  constructor(
    private readonly domain: CapacityDomain,
    private readonly repository: CapacityRepository,
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  // ─── Allocation CRUD ──────────────────────────────────────────────────────

  async createAllocation(body: unknown, userId: string) {
    const validated = this.domain.validateCreateAllocation(body);

    // Validate employee exists
    const employeeExists = await this.repository.employeeExists(validated.employeeId);
    if (!employeeExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'employeeId',
            message: `Employee with id "${validated.employeeId}" does not exist`,
          },
        ],
      });
    }

    // Validate squad exists
    const squadExists = await this.repository.squadExists(validated.squadId);
    if (!squadExists) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'squadId',
            message: `Squad with id "${validated.squadId}" does not exist`,
          },
        ],
      });
    }

    // Validate total capacity constraint
    const currentTotal = await this.repository.getEmployeeTotalCapacity(validated.employeeId);
    this.domain.validateTotalCapacity(currentTotal, validated.percentage);

    const allocation = await this.repository.createAllocation(validated);

    // Invalidate cache
    await this.invalidateCapacityCache(validated.employeeId);

    // Create audit record
    await this.createAuditRecord(userId, 'CapacityAllocation', allocation.id, 'CREATE', {
      after: allocation,
    });

    return allocation;
  }

  async findAllocations(employeeId?: string, squadId?: string) {
    return this.repository.findAllocations(employeeId, squadId);
  }

  async findAllocationById(id: string) {
    return this.repository.findAllocationById(id);
  }

  async updateAllocation(id: string, body: unknown, userId: string) {
    const validated = this.domain.validateUpdateAllocation(body);

    const existing = await this.repository.findAllocationById(id);

    // If percentage is changing, validate total capacity constraint
    if (validated.percentage !== undefined) {
      const employeeId = validated.employeeId ?? existing.employeeId;
      const currentTotal = await this.repository.getEmployeeTotalCapacity(employeeId, id);
      this.domain.validateTotalCapacity(currentTotal, validated.percentage);
    }

    // If employeeId is changing, also validate against new employee's total
    if (validated.employeeId !== undefined && validated.employeeId !== existing.employeeId) {
      const employeeExists = await this.repository.employeeExists(validated.employeeId);
      if (!employeeExists) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'employeeId',
              message: `Employee with id "${validated.employeeId}" does not exist`,
            },
          ],
        });
      }

      const newPercentage = validated.percentage ?? existing.percentage;
      const newEmployeeTotal = await this.repository.getEmployeeTotalCapacity(validated.employeeId);
      this.domain.validateTotalCapacity(newEmployeeTotal, newPercentage);
    }

    // If squadId is changing, validate squad exists
    if (validated.squadId !== undefined && validated.squadId !== existing.squadId) {
      const squadExists = await this.repository.squadExists(validated.squadId);
      if (!squadExists) {
        throw new BadRequestException({
          message: 'Validation failed',
          details: [
            {
              field: 'squadId',
              message: `Squad with id "${validated.squadId}" does not exist`,
            },
          ],
        });
      }
    }

    const updated = await this.repository.updateAllocation(id, validated);

    // Invalidate cache for affected employees
    await this.invalidateCapacityCache(existing.employeeId);
    if (validated.employeeId && validated.employeeId !== existing.employeeId) {
      await this.invalidateCapacityCache(validated.employeeId);
    }

    // Create audit record
    await this.createAuditRecord(userId, 'CapacityAllocation', id, 'UPDATE', {
      before: existing,
      after: updated,
    });

    return updated;
  }

  async deleteAllocation(id: string, userId: string) {
    const existing = await this.repository.findAllocationById(id);

    const result = await this.repository.deleteAllocation(id);

    // Invalidate cache
    await this.invalidateCapacityCache(existing.employeeId);

    // Create audit record
    await this.createAuditRecord(userId, 'CapacityAllocation', id, 'DELETE', {
      before: existing,
    });

    return result;
  }

  // ─── Capacity Overview ────────────────────────────────────────────────────

  async getCapacityOverview(employeeId: string) {
    // Try cache first
    const cacheKey = `${CACHE_PREFIX}${employeeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Compute overview
    const allocations = await this.repository.getEmployeeAllocations(employeeId);
    const totalAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);

    const overview = {
      employeeId,
      totalAllocated,
      remaining: 100 - totalAllocated,
      allocations: allocations.map((a) => ({
        id: a.id,
        squadId: a.squadId,
        squadName: a.squad.name,
        percentage: a.percentage,
      })),
    };

    // Cache with TTL
    await this.redis.set(cacheKey, JSON.stringify(overview), 'EX', CACHE_TTL_SECONDS);

    return overview;
  }

  // ─── Cache Invalidation ───────────────────────────────────────────────────

  private async invalidateCapacityCache(employeeId: string): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${employeeId}`;
    await this.redis.del(cacheKey);
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
