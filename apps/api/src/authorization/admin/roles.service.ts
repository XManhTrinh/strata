import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, PermissionScopeV2 } from '@strata/database';
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
    const existing = await this.prisma.roleV2.findUnique({
      where: { companyId_name: { companyId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    return this.prisma.roleV2.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.roleV2.findMany({
      where: { companyId, archivedAt: null },
      include: { _count: { select: { assignments: true, permissions: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const role = await this.prisma.roleV2.findFirst({
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
    const role = await this.prisma.roleV2.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name) {
      const existing = await this.prisma.roleV2.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.roleV2.update({
      where: { id },
      data: dto,
    });
  }

  async duplicate(companyId: string, id: string) {
    const role = await this.prisma.roleV2.findFirst({
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
      await this.prisma.roleV2.findUnique({
        where: { companyId_name: { companyId, name: newName } },
      })
    ) {
      counter++;
      newName = `${role.name} (Copy ${counter})`;
    }

    const newRole = await this.prisma.roleV2.create({
      data: {
        companyId,
        name: newName,
        description: role.description,
      },
    });

    // Copy all permission assignments
    if (role.permissions.length > 0) {
      await this.prisma.rolePermissionAssignment.createMany({
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
    const role = await this.prisma.roleV2.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.archivedAt) {
      throw new BadRequestException('Role is already archived');
    }
    return this.prisma.roleV2.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async delete(companyId: string, id: string) {
    const role = await this.prisma.roleV2.findFirst({
      where: { id, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if role is assigned to any user
    const assignedCount = await this.prisma.roleAssignmentV2.count({
      where: { roleId: id },
    });
    if (assignedCount > 0) {
      throw new BadRequestException(
        'Cannot delete role: it is currently assigned to users',
      );
    }

    // Delete permission assignments first
    await this.prisma.rolePermissionAssignment.deleteMany({
      where: { roleId: id },
    });

    await this.prisma.roleV2.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Permission Assignment ──────────────────────────────────────────────────

  async addPermission(companyId: string, roleId: string, dto: AssignPermissionDto) {
    const role = await this.prisma.roleV2.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate feature and permission exist
    const isValid = await this.featureRegistry.isValidAction(
      dto.featureKey,
      dto.permissionKey,
    );
    if (!isValid) {
      throw new BadRequestException(
        `Invalid feature permission: ${dto.featureKey}:${dto.permissionKey}`,
      );
    }

    // Find the feature permission record
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

    // Check for duplicate
    const existing = await this.prisma.rolePermissionAssignment.findUnique({
      where: {
        roleId_featurePermissionId_scope: {
          roleId,
          featurePermissionId: featurePermission.id,
          scope: dto.scope as PermissionScopeV2,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This permission with this scope is already assigned to the role',
      );
    }

    const assignment = await this.prisma.rolePermissionAssignment.create({
      data: {
        roleId,
        featurePermissionId: featurePermission.id,
        scope: dto.scope as PermissionScopeV2,
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
    const role = await this.prisma.roleV2.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const assignment = await this.prisma.rolePermissionAssignment.findFirst({
      where: { id: permissionAssignmentId, roleId },
    });
    if (!assignment) {
      throw new NotFoundException('Permission assignment not found');
    }

    await this.prisma.rolePermissionAssignment.delete({
      where: { id: permissionAssignmentId },
    });

    await this.permissionCache.invalidateRole(companyId, roleId);

    return { deleted: true };
  }

  async bulkPermissions(companyId: string, roleId: string, dto: BulkPermissionsDto) {
    const role = await this.prisma.roleV2.findFirst({
      where: { id: roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
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
        await this.prisma.rolePermissionAssignment.create({
          data: {
            roleId,
            featurePermissionId: featurePermission.id,
            scope: entry.scope as PermissionScopeV2,
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

      const result = await this.prisma.rolePermissionAssignment.deleteMany({
        where: {
          roleId,
          featurePermissionId: featurePermission.id,
          scope: entry.scope as PermissionScopeV2,
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
    const role = await this.prisma.roleV2.findFirst({
      where: { id: dto.roleId, companyId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check for duplicate assignment
    const existing = await this.prisma.roleAssignmentV2.findUnique({
      where: {
        membershipId_roleId: { membershipId: membership.id, roleId: dto.roleId },
      },
    });
    if (existing) {
      throw new ConflictException('Role is already assigned to this user');
    }

    const assignment = await this.prisma.roleAssignmentV2.create({
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

    return this.prisma.roleAssignmentV2.findMany({
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
        const assignmentCount = await this.prisma.roleAssignmentV2.count({
          where: { membershipId: membership.id },
        });
        if (assignmentCount <= 1) {
          throw new BadRequestException(
            'Cannot remove the last role from the only super admin',
          );
        }
      }
    }

    const assignment = await this.prisma.roleAssignmentV2.findUnique({
      where: {
        membershipId_roleId: { membershipId: membership.id, roleId },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.roleAssignmentV2.delete({
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
    const roleAssignments = await this.prisma.roleAssignmentV2.findMany({
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
      { feature: string; permission: string; scope: PermissionScopeV2; displayName: string; featureDisplayName: string }
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
