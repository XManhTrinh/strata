import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { SetManagerDto } from './dto/set-manager.dto';
import { directReportsKey } from '../permission-cache/permission-cache.keys';

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Set a manager for a user. Detects cycles before persisting.
   */
  async setManager(companyId: string, dto: SetManagerDto) {
    const { userId, managerId } = dto;

    if (userId === managerId) {
      throw new BadRequestException('A user cannot be their own manager');
    }

    // Verify both users are members of the company
    const [userMembership, managerMembership] = await Promise.all([
      this.prisma.userCompanyMembership.findUnique({
        where: { userId_companyId: { userId, companyId } },
      }),
      this.prisma.userCompanyMembership.findUnique({
        where: { userId_companyId: { userId: managerId, companyId } },
      }),
    ]);

    if (!userMembership) {
      throw new NotFoundException('User is not a member of this company');
    }
    if (!managerMembership) {
      throw new NotFoundException('Manager is not a member of this company');
    }

    // Detect cycle: walk the manager's chain upward to see if userId appears
    const hasCycle = await this.detectCycle(companyId, userId, managerId);
    if (hasCycle) {
      throw new UnprocessableEntityException(
        'Cannot set manager: would create a cycle in the reporting hierarchy',
      );
    }

    // Get old relationship for cache invalidation
    const oldRelationship = await this.prisma.reportingRelationship.findUnique({
      where: { userId },
    });

    // Upsert the relationship
    const result = await this.prisma.reportingRelationship.upsert({
      where: { userId },
      create: { companyId, userId, managerId },
      update: { managerId },
    });

    // Invalidate caches
    await this.invalidateReportsCaches(companyId, managerId);
    if (oldRelationship && oldRelationship.managerId !== managerId) {
      await this.invalidateReportsCaches(companyId, oldRelationship.managerId);
    }

    return result;
  }

  /**
   * Get a user's manager.
   */
  async getManager(companyId: string, userId: string) {
    const relationship = await this.prisma.reportingRelationship.findFirst({
      where: { companyId, userId },
    });
    if (!relationship) {
      return { userId, managerId: null };
    }
    return relationship;
  }

  /**
   * Get direct reports for a user.
   */
  async getDirectReports(companyId: string, userId: string) {
    const reports = await this.prisma.reportingRelationship.findMany({
      where: { companyId, managerId: userId },
    });
    return reports;
  }

  /**
   * Remove the manager relationship for a user.
   */
  async removeManager(companyId: string, userId: string) {
    const relationship = await this.prisma.reportingRelationship.findFirst({
      where: { companyId, userId },
    });
    if (!relationship) {
      throw new NotFoundException('No manager relationship found for this user');
    }

    await this.prisma.reportingRelationship.delete({
      where: { id: relationship.id },
    });

    // Invalidate old manager's direct reports cache
    await this.invalidateReportsCaches(companyId, relationship.managerId);

    return { removed: true };
  }

  /**
   * Detects if setting managerId as userId's manager would create a cycle.
   * Walk from managerId upward through the chain. If we encounter userId, there's a cycle.
   */
  private async detectCycle(
    companyId: string,
    userId: string,
    managerId: string,
  ): Promise<boolean> {
    let currentId: string | null = managerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === userId) return true;
      if (visited.has(currentId)) return false; // Already visited, no further cycle through userId
      visited.add(currentId);

      const relationship: { managerId: string } | null =
        await this.prisma.reportingRelationship.findFirst({
          where: { companyId, userId: currentId },
          select: { managerId: true },
        });
      currentId = relationship?.managerId ?? null;
    }

    return false;
  }

  private async invalidateReportsCaches(
    companyId: string,
    managerId: string,
  ): Promise<void> {
    try {
      const key = directReportsKey(companyId, managerId);
      await this.redis.del(key);
    } catch {
      // Graceful degradation
    }
  }
}
