import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, PermissionScope } from '@strata/database';
import { PermissionCacheService } from '../permission-cache/permission-cache.service';
import { FeatureRegistryService } from '../feature-registry/feature-registry.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { BulkPermissionsDto } from './dto/bulk-permissions.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly permissionCache: PermissionCacheService,
    private readonly featureRegistry: FeatureRegistryService,
  ) {}

  // ─── Role CRUD ──────────────────────────────────────────────────────────────

  async create(companyId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { companyId_name: { companyId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    return this.prisma.role.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  /**
   * Create an "Admin" role granting every permission (all feature permissions
   * for the company's enabled features) at COMPANY scope.
   */
  async createAdmin(companyId: string) {
    // Only one admin role per company.
    const existingAdmin = await this.prisma.role.findFirst({
      where: { companyId, isSystem: true, archivedAt: null },
    });
    if (existingAdmin) {
      throw new ConflictException('An Admin role already exists');
    }

    // Unique name — fall back to "Admin (2)", etc. if one already exists.
    let name = 'Admin';
    let counter = 1;
    while (
      await this.prisma.role.findUnique({
        where: { companyId_name: { companyId, name } },
      })
    ) {
      counter++;
      name = `Admin (${counter})`;
    }

    const role = await this.prisma.role.create({
      data: {
        companyId,
        name,
        description: 'Full access to all features',
        isSystem: true,
      },
    });

    // Features are enabled by default; a feature is only "off" if it has a
    // CompanyFeature row explicitly set to enabled=false. Grant all permissions
    // except those on explicitly-disabled features (skip deprecated).
    const disabled = await this.prisma.companyFeature.findMany({
      where: { companyId, enabled: false },
      select: { featureId: true },
    });
    const disabledFeatureIds = disabled.map((f) => f.featureId);

    const permissions = await this.prisma.featurePermission.findMany({
      where: {
        deprecatedAt: null,
        ...(disabledFeatureIds.length > 0
          ? { featureId: { notIn: disabledFeatureIds } }
          : {}),
      },
      select: { id: true },
    });

    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          featurePermissionId: p.id,
          scope: PermissionScope.COMPANY,
        })),
        skipDuplicates: true,
      });
    }

    this.permissionCache.invalidateCompany(companyId);
    return this.findOne(companyId, role.id);
  }

  async findAll(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId, archivedAt: null },
      include: { _count: { select: { assignments: true, permissions: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
      include: {
        permissions: {
          include: { featurePermission: { include: { feature: true } } },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(companyId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name) {
      const existing = await this.prisma.role.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async duplicate(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
      include: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Generate a unique name
    let newName = `${role.name} (Copy)`;
    let counter = 1;
    while (
      await this.prisma.role.findUnique({
        where: { companyId_name: { companyId, name: newName } },
      })
    ) {
      counter++;
      newName = `${role.name} (Copy ${counter})`;
    }

    const newRole = await this.prisma.role.create({
      data: {
        companyId,
        name: newName,
        description: role.description,
      },
    });

    // Copy all permission assignments
    if (role.permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: role.permissions.map((p) => ({
          roleId: newRole.id,
          featurePermissionId: p.featurePermissionId,
          scope: p.scope,
        })),
      });
    }

    return this.findOne(companyId, newRole.id);
  }

  async archive(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.archivedAt) {
      throw new BadRequestException('Role is already archived');
    }
    return this.prisma.role.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async delete(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Members assigned this role lose it. Remove assignments + permission grants
    // alongside the role in a single transaction.
    const affectedUsers = await this.prisma.roleAssignment.count({
      where: { roleId: id },
    });

    await this.prisma.$transaction([
      this.prisma.roleAssignment.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.role.delete({ where: { id } }),
    ]);

    // Users who held this role need their permission cache refreshed.
    await this.permissionCache.invalidateCompany(companyId);

    return { deleted: true, affectedUsers };
  }

  // ─── Permission Assignment ──────────────────────────────────────────────────

  async addPermission(companyId: string, roleId: string, dto: AssignPermissionDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    let featurePermissionId: string;

    if ('featurePermissionId' in dto) {
      // New format: direct featurePermissionId
      const fp = await this.prisma.featurePermission.findUnique({
        where: { id: dto.featurePermissionId },
      });
      if (!fp) {
        throw new BadRequestException('Feature permission not found');
      }
      featurePermissionId = fp.id;
    } else {
      // Legacy format: featureKey + permissionKey
      const isValid = await this.featureRegistry.isValidAction(
        dto.featureKey,
        dto.permissionKey,
      );
      if (!isValid) {
        throw new BadRequestException(
          `Invalid feature permission: ${dto.featureKey}:${dto.permissionKey}`,
        );
      }

      const featurePermission = await this.prisma.featurePermission.findFirst({
        where: {
          key: dto.permissionKey,
          feature: { key: dto.featureKey },
        },
      });
      if (!featurePermission) {
        throw new BadRequestException(
          `Feature permission not found: ${dto.featureKey}:${dto.permissionKey}`,
        );
      }
      featurePermissionId = featurePermission.id;
    }

    // Check for duplicate
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_featurePermissionId_scope: {
          roleId,
          featurePermissionId,
          scope: dto.scope as PermissionScope,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This permission with this scope is already assigned to the role',
      );
    }

    const assignment = await this.prisma.rolePermission.create({
      data: {
        roleId,
        featurePermissionId,
        scope: dto.scope as PermissionScope,
      },
      include: { featurePermission: { include: { feature: true } } },
    });

    // Invalidate caches for all users with this role
    await this.permissionCache.invalidateRole(companyId, roleId);

    return assignment;
  }

  async removePermission(
    companyId: string,
    roleId: string,
    permissionAssignmentId: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const assignment = await this.prisma.rolePermission.findFirst({
      where: { id: permissionAssignmentId, roleId },
    });
    if (!assignment) {
      throw new NotFoundException('Permission assignment not found');
    }

    await this.prisma.rolePermission.delete({
      where: { id: permissionAssignmentId },
    });

    await this.permissionCache.invalidateRole(companyId, roleId);

    return { deleted: true };
  }

  async bulkPermissions(companyId: string, roleId: string, dto: BulkPermissionsDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    // The Admin (system) role always has full access; its permissions are managed
    // via feature toggles, not edited directly.
    if (role.isSystem) {
      throw new BadRequestException(
        'The Admin role has full access and cannot be edited. Disable features or create a custom role instead.',
      );
    }

    let added = 0;
    let removed = 0;

    // Process additions
    for (const entry of dto.add) {
      const featurePermission = await this.prisma.featurePermission.findFirst({
        where: {
          key: entry.permissionKey,
          feature: { key: entry.featureKey },
        },
      });
      if (!featurePermission) continue;

      try {
        await this.prisma.rolePermission.create({
          data: {
            roleId,
            featurePermissionId: featurePermission.id,
            scope: entry.scope as PermissionScope,
          },
        });
        added++;
      } catch {
        // Ignore duplicates
      }
    }

    // Process removals
    for (const entry of dto.remove) {
      const featurePermission = await this.prisma.featurePermission.findFirst({
        where: {
          key: entry.permissionKey,
          feature: { key: entry.featureKey },
        },
      });
      if (!featurePermission) continue;

      const result = await this.prisma.rolePermission.deleteMany({
        where: {
          roleId,
          featurePermissionId: featurePermission.id,
          scope: entry.scope as PermissionScope,
        },
      });
      removed += result.count;
    }

    await this.permissionCache.invalidateRole(companyId, roleId);

    return { added, removed };
  }

  // ─── Role Assignment ────────────────────────────────────────────────────────

  async assignRoleToUser(companyId: string, userId: string, dto: AssignRoleDto) {
    // Get or verify membership
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this company');
    }

    // Verify role exists
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check for duplicate assignment
    const existing = await this.prisma.roleAssignment.findUnique({
      where: {
        membershipId_roleId: { membershipId: membership.id, roleId: dto.roleId },
      },
    });
    if (existing) {
      throw new ConflictException('Role is already assigned to this user');
    }

    const assignment = await this.prisma.roleAssignment.create({
      data: {
        membershipId: membership.id,
        roleId: dto.roleId,
      },
      include: { role: true },
    });

    await this.permissionCache.invalidateUser(companyId, userId);

    return assignment;
  }

  async getUserRoles(companyId: string, userId: string) {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this company');
    }

    return this.prisma.roleAssignment.findMany({
      where: { membershipId: membership.id },
      include: { role: true },
    });
  }

  async removeRoleFromUser(companyId: string, userId: string, roleId: string) {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this company');
    }

    // Enforce minimum super admin invariant
    if (membership.isSuperAdmin) {
      const superAdminCount = await this.prisma.userCompanyMembership.count({
        where: { companyId, isSuperAdmin: true },
      });
      if (superAdminCount <= 1) {
        // Check if this role removal would effectively remove super admin status
        // For safety, we prevent removing any role from the last super admin
        const assignmentCount = await this.prisma.roleAssignment.count({
          where: { membershipId: membership.id },
        });
        if (assignmentCount <= 1) {
          throw new BadRequestException(
            'Cannot remove the last role from the only super admin',
          );
        }
      }
    }

    const assignment = await this.prisma.roleAssignment.findUnique({
      where: {
        membershipId_roleId: { membershipId: membership.id, roleId },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.roleAssignment.delete({
      where: { id: assignment.id },
    });

    await this.permissionCache.invalidateUser(companyId, userId);

    return { removed: true };
  }

  async getEffectivePermissions(companyId: string, userId: string) {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this company');
    }

    // Get all role assignments for this user
    const roleAssignments = await this.prisma.roleAssignment.findMany({
      where: { membershipId: membership.id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                featurePermission: { include: { feature: true } },
              },
            },
          },
        },
      },
    });

    // Resolve: union permissions, compute broadest scope per feature:permission
    const permissionMap = new Map<
      string,
      { feature: string; permission: string; scope: PermissionScope; displayName: string; featureDisplayName: string }
    >();

    const scopeOrder: Record<string, number> = {
      OWN: 1,
      DIRECT_REPORTS: 2,
      ORGANIZATION_UNIT: 3,
      BRANCH: 4,
      COMPANY: 5,
      GLOBAL: 6,
    };

    for (const ra of roleAssignments) {
      for (const rpa of ra.role.permissions) {
        const key = `${rpa.featurePermission.feature.key}:${rpa.featurePermission.key}`;
        const existing = permissionMap.get(key);
        if (
          !existing ||
          scopeOrder[rpa.scope] > scopeOrder[existing.scope]
        ) {
          permissionMap.set(key, {
            feature: rpa.featurePermission.feature.key,
            permission: rpa.featurePermission.key,
            scope: rpa.scope,
            displayName: rpa.featurePermission.displayName,
            featureDisplayName: rpa.featurePermission.feature.displayName,
          });
        }
      }
    }

    return {
      userId,
      companyId,
      isSuperAdmin: membership.isSuperAdmin,
      permissions: Array.from(permissionMap.values()),
    };
  }
}
