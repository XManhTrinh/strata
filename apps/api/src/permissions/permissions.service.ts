import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UserPermission } from './permissions.domain';
import { PermissionScope } from './permissions.decorator';

const PERMISSIONS_CACHE_TTL = 300; // 5 minutes in seconds
const PERMISSIONS_CACHE_PREFIX = 'permissions:';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  // ─── Role CRUD ──────────────────────────────────────────────────────────────

  async createRole(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: { permissions: { include: { permission: true } } },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.getRole(id); // ensure exists
    try {
      const updated = await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
        include: { permissions: { include: { permission: true } } },
      });
      // Invalidate all user permission caches (role changed)
      await this.invalidateAllPermissionCaches();
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Role with name "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async deleteRole(id: string) {
    await this.getRole(id); // ensure exists
    // Delete role assignments and role permissions first
    await this.prisma.roleAssignment.deleteMany({ where: { roleId: id } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    await this.invalidateAllPermissionCaches();
    return { message: 'Role deleted successfully' };
  }

  // ─── Permission Management ──────────────────────────────────────────────────

  async addPermissionToRole(roleId: string, dto: CreatePermissionDto) {
    await this.getRole(roleId); // ensure role exists

    // Find or create the permission
    let permission = await this.prisma.permission.findUnique({
      where: { action_resource: { action: dto.action, resource: dto.resource } },
    });

    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { action: dto.action, resource: dto.resource },
      });
    }

    // Link permission to role
    try {
      await this.prisma.rolePermission.create({
        data: { roleId, permissionId: permission.id },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Permission already assigned to this role');
      }
      throw error;
    }

    // Invalidate caches since role permissions changed
    await this.invalidateAllPermissionCaches();

    return this.getRole(roleId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permission not found on this role');
    }

    await this.prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });

    // Invalidate caches since role permissions changed
    await this.invalidateAllPermissionCaches();

    return this.getRole(roleId);
  }

  // ─── Role Assignment ────────────────────────────────────────────────────────

  async assignRole(dto: AssignRoleDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User with id "${dto.userId}" not found`);
    }

    // Verify role exists
    await this.getRole(dto.roleId);

    try {
      const assignment = await this.prisma.roleAssignment.create({
        data: {
          userId: dto.userId,
          roleId: dto.roleId,
          scope: dto.scope,
        },
        include: { role: true },
      });

      // Invalidate the user's permission cache
      await this.invalidateUserPermissionCache(dto.userId);

      return assignment;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This role assignment already exists for this user with this scope',
        );
      }
      throw error;
    }
  }

  async removeAssignment(id: string) {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Role assignment with id "${id}" not found`);
    }

    await this.prisma.roleAssignment.delete({ where: { id } });

    // Invalidate the user's permission cache
    await this.invalidateUserPermissionCache(assignment.userId);

    return { message: 'Role assignment removed successfully' };
  }

  async getUserAssignments(userId: string) {
    return this.prisma.roleAssignment.findMany({
      where: { userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  }

  // ─── Permission Evaluation (with caching) ──────────────────────────────────

  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const cacheKey = `${PERMISSIONS_CACHE_PREFIX}${userId}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions: UserPermission[] = [];

    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) {
        permissions.push({
          action: rp.permission.action,
          resource: rp.permission.resource,
          scope: assignment.scope as PermissionScope,
        });
      }
    }

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', PERMISSIONS_CACHE_TTL);

    return permissions;
  }

  // ─── Cache Invalidation ─────────────────────────────────────────────────────

  private async invalidateUserPermissionCache(userId: string): Promise<void> {
    const cacheKey = `${PERMISSIONS_CACHE_PREFIX}${userId}`;
    await this.redis.del(cacheKey);
  }

  private async invalidateAllPermissionCaches(): Promise<void> {
    // Scan for all permission cache keys and delete them
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${PERMISSIONS_CACHE_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
