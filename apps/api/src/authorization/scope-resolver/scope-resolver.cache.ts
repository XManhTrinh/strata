import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaClient } from '@strata/database';
import {
  branchScopeKey,
  directReportsKey,
  CACHE_TTL,
} from '../permission-cache/permission-cache.keys';

@Injectable()
export class ScopeResolverCache {
  private readonly logger = new Logger(ScopeResolverCache.name);

  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * Gets the descendant org unit IDs for a given org unit (BRANCH scope).
   * Checks Redis SET first; on miss, computes via recursive CTE and caches.
   */
  async getDescendantOrgUnitIds(
    companyId: string,
    orgUnitId: string,
  ): Promise<string[]> {
    const key = branchScopeKey(companyId, orgUnitId);

    try {
      const cached = await this.redis.smembers(key);
      if (cached.length > 0) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Redis SMEMBERS failed for branch scope: ${error}`);
    }

    // Cache miss — compute descendants via recursive CTE
    const descendants = await this.computeDescendants(orgUnitId);
    // Include the actor's own unit
    const allUnitIds = [orgUnitId, ...descendants];

    // Cache in Redis SET with TTL
    try {
      if (allUnitIds.length > 0) {
        await this.redis.sadd(key, ...allUnitIds);
        await this.redis.expire(key, CACHE_TTL.BRANCH_SCOPE);
      }
    } catch (error) {
      this.logger.warn(`Redis SADD failed for branch scope cache: ${error}`);
    }

    return allUnitIds;
  }

  /**
   * Gets the direct report user IDs for a manager.
   * Checks Redis SET first; on miss, queries DB and caches.
   */
  async getDirectReportUserIds(
    companyId: string,
    managerId: string,
  ): Promise<string[]> {
    const key = directReportsKey(companyId, managerId);

    try {
      const cached = await this.redis.smembers(key);
      if (cached.length > 0) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(
        `Redis SMEMBERS failed for direct reports: ${error}`,
      );
    }

    // Cache miss — query DB
    const reports = await this.prisma.reportingRelationship.findMany({
      where: { companyId, managerId },
      select: { userId: true },
    });

    const reportIds = reports.map((r) => r.userId);

    // Cache in Redis SET with TTL
    try {
      if (reportIds.length > 0) {
        await this.redis.sadd(key, ...reportIds);
        await this.redis.expire(key, CACHE_TTL.DIRECT_REPORTS);
      }
    } catch (error) {
      this.logger.warn(
        `Redis SADD failed for direct reports cache: ${error}`,
      );
    }

    return reportIds;
  }

  /**
   * Computes all descendant org unit IDs using a PostgreSQL recursive CTE.
   * Excludes archived units.
   */
  private async computeDescendants(orgUnitId: string): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "OrganizationUnit" WHERE "parentId" = ${orgUnitId} AND "archivedAt" IS NULL
        UNION ALL
        SELECT ou.id FROM "OrganizationUnit" ou
        JOIN descendants d ON ou."parentId" = d.id
        WHERE ou."archivedAt" IS NULL
      )
      SELECT id FROM descendants
    `;

    return result.map((row) => row.id);
  }
}
