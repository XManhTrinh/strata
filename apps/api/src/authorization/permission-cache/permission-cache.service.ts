import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EffectivePermission } from '../authorization.types';
import {
  CACHE_TTL,
  userPermissionsKey,
  companyPermissionsPattern,
} from './permission-cache.keys';

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);

  constructor(private readonly redis: Redis) {}

  /**
   * Retrieves cached effective permissions for a user.
   * Returns null on cache miss or Redis unavailability (triggering DB fallback).
   */
  async getEffectivePermissions(
    companyId: string,
    userId: string,
  ): Promise<EffectivePermission[] | null> {
    try {
      const key = userPermissionsKey(companyId, userId);
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as EffectivePermission[];
    } catch (error) {
      this.logger.warn(
        `Redis GET failed for permissions cache [companyId=${companyId}, userId=${userId}]: ${error}`,
      );
      return null;
    }
  }

  /**
   * Stores effective permissions for a user with a 5-minute TTL.
   * Silently fails if Redis is unavailable.
   */
  async setEffectivePermissions(
    companyId: string,
    userId: string,
    permissions: EffectivePermission[],
  ): Promise<void> {
    try {
      const key = userPermissionsKey(companyId, userId);
      await this.redis.set(
        key,
        JSON.stringify(permissions),
        'EX',
        CACHE_TTL.USER_PERMISSIONS,
      );
    } catch (error) {
      this.logger.warn(
        `Redis SET failed for permissions cache [companyId=${companyId}, userId=${userId}]: ${error}`,
      );
    }
  }

  /**
   * Invalidates the permission cache for a specific user.
   */
  async invalidateUser(companyId: string, userId: string): Promise<void> {
    try {
      const key = userPermissionsKey(companyId, userId);
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(
        `Redis DEL failed for user invalidation [companyId=${companyId}, userId=${userId}]: ${error}`,
      );
    }
  }

  /**
   * Invalidates permission caches for all users assigned a given role.
   * Uses SCAN to find matching keys without blocking Redis.
   */
  async invalidateRole(companyId: string, roleId: string): Promise<void> {
    try {
      // For role invalidation we invalidate all user caches in the company.
      // A more targeted approach would require tracking role→user mappings in Redis,
      // but company-wide invalidation is safe and correct.
      await this.invalidateCompany(companyId);
    } catch (error) {
      this.logger.warn(
        `Redis invalidation failed for role [companyId=${companyId}, roleId=${roleId}]: ${error}`,
      );
    }
  }

  /**
   * Invalidates all permission caches for a company.
   * Uses SCAN to iterate keys matching the company pattern.
   */
  async invalidateCompany(companyId: string): Promise<void> {
    try {
      const pattern = companyPermissionsPattern(companyId);
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(
        `Redis invalidation failed for company [companyId=${companyId}]: ${error}`,
      );
    }
  }
}
