import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { MoveOrgUnitDto } from './dto/move-org-unit.dto';
import { companyBranchScopePattern } from '../permission-cache/permission-cache.keys';

@Injectable()
export class OrgUnitsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  async create(companyId: string, dto: CreateOrgUnitDto) {
    // Validate org unit type exists and is not archived
    const type = await this.prisma.organizationUnitType.findFirst({
      where: { id: dto.typeId, companyId, archivedAt: null },
    });
    if (!type) {
      throw new BadRequestException(
        'Organization unit type not found or is archived',
      );
    }

    // Compute materialized path
    let path = '/';
    if (dto.parentId) {
      const parent = await this.prisma.organizationUnit.findFirst({
        where: { id: dto.parentId, companyId },
      });
      if (!parent) {
        throw new BadRequestException('Parent organization unit not found');
      }
      path = `${parent.path}${parent.id}/`;
    }

    return this.prisma.organizationUnit.create({
      data: {
        companyId,
        typeId: dto.typeId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId || null,
        sortOrder: dto.sortOrder ?? 0,
        managerId: dto.managerId || null,
        path,
      },
    });
  }

  async findAll(companyId: string, parentId?: string) {
    const where: any = { companyId, archivedAt: null };
    if (parentId) {
      where.parentId = parentId;
    }

    return this.prisma.organizationUnit.findMany({
      where,
      include: { type: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTree(companyId: string) {
    const allUnits = await this.prisma.organizationUnit.findMany({
      where: { companyId, archivedAt: null },
      include: { type: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree from flat list
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const unit of allUnits) {
      map.set(unit.id, { ...unit, children: [] });
    }

    for (const unit of allUnits) {
      const node = map.get(unit.id)!;
      if (unit.parentId && map.has(unit.parentId)) {
        map.get(unit.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findOne(companyId: string, id: string) {
    const unit = await this.prisma.organizationUnit.findFirst({
      where: { id, companyId },
      include: { type: true, children: true, members: true },
    });
    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }
    return unit;
  }

  async update(companyId: string, id: string, dto: UpdateOrgUnitDto) {
    await this.findOne(companyId, id);
    return this.prisma.organizationUnit.update({
      where: { id },
      data: dto,
    });
  }

  async move(companyId: string, id: string, dto: MoveOrgUnitDto) {
    const unit = await this.prisma.organizationUnit.findFirst({
      where: { id, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }

    const newParentId = dto.newParentId;

    // Detect circular reference: check if newParent is a descendant of this unit
    if (newParentId) {
      const isDescendant = await this.isDescendant(id, newParentId);
      if (isDescendant) {
        throw new UnprocessableEntityException(
          'Cannot move organization unit: target parent is a descendant of this unit, which would create a cycle',
        );
      }
    }

    // Compute new path
    let newPath = '/';
    if (newParentId) {
      const parent = await this.prisma.organizationUnit.findFirst({
        where: { id: newParentId, companyId },
      });
      if (!parent) {
        throw new BadRequestException('Target parent organization unit not found');
      }
      newPath = `${parent.path}${parent.id}/`;
    }

    const oldPath = unit.path;
    const oldFullPath = `${oldPath}${unit.id}/`;
    const newFullPath = `${newPath}${unit.id}/`;

    // Update the unit itself
    await this.prisma.organizationUnit.update({
      where: { id },
      data: { parentId: newParentId, path: newPath },
    });

    // Update all descendants' paths
    const descendants = await this.prisma.organizationUnit.findMany({
      where: { companyId, path: { startsWith: oldFullPath } },
    });

    for (const descendant of descendants) {
      const updatedPath = descendant.path.replace(oldFullPath, newFullPath);
      await this.prisma.organizationUnit.update({
        where: { id: descendant.id },
        data: { path: updatedPath },
      });
    }

    // Invalidate branch scope caches for the company
    await this.invalidateBranchCaches(companyId);

    return this.prisma.organizationUnit.findFirst({
      where: { id, companyId },
      include: { type: true },
    });
  }

  async archive(companyId: string, id: string) {
    const unit = await this.prisma.organizationUnit.findFirst({
      where: { id, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }
    if (unit.archivedAt) {
      throw new BadRequestException('Organization unit is already archived');
    }
    return this.prisma.organizationUnit.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async assignMembers(companyId: string, orgUnitId: string, userIds: string[]) {
    const unit = await this.prisma.organizationUnit.findFirst({
      where: { id: orgUnitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }

    // Update membership records to assign them to this org unit
    const results = await Promise.all(
      userIds.map((userId) =>
        this.prisma.userCompanyMembership.updateMany({
          where: { userId, companyId },
          data: { orgUnitId },
        }),
      ),
    );

    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
  }

  async removeMember(companyId: string, orgUnitId: string, userId: string) {
    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId, companyId, orgUnitId },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this organization unit');
    }

    await this.prisma.userCompanyMembership.update({
      where: { id: membership.id },
      data: { orgUnitId: null },
    });

    return { removed: true };
  }

  /**
   * Checks if targetId is a descendant of ancestorId by traversing parent chain.
   */
  private async isDescendant(
    ancestorId: string,
    targetId: string,
  ): Promise<boolean> {
    let currentId: string | null = targetId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) return false; // Safety: break loops
      visited.add(currentId);

      const current: { parentId: string | null } | null =
        await this.prisma.organizationUnit.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = current?.parentId ?? null;
    }

    return false;
  }

  private async invalidateBranchCaches(companyId: string): Promise<void> {
    try {
      const pattern = companyBranchScopePattern(companyId);
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
    } catch {
      // Graceful degradation
    }
  }
}
