import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import {
  OrgTreeNode,
  OrgChartPerson,
  FlatEmployee,
  FlatRelationship,
  UnitViewResponse,
  UnitEmployee,
  UnitAncestor,
} from './org-chart.types';

@Injectable()
export class OrgChartService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Build the org chart tree from flat employee and relationship arrays.
   * Pure function — O(n) hash-map approach.
   */
  buildTree(employees: FlatEmployee[], relationships: FlatRelationship[]): OrgTreeNode[] {
    // Create node map
    const nodeMap = new Map<string, OrgTreeNode>();
    for (const emp of employees) {
      nodeMap.set(emp.userId, {
        id: emp.userId,
        fullName: emp.fullName,
        email: emp.email,
        positionTitle: emp.positionTitle,
        managerId: null,
        departmentName: emp.departmentName,
        avatarUrl: null,
        directReports: [],
      });
    }

    // Wire relationships
    const hasManager = new Set<string>();
    for (const rel of relationships) {
      const child = nodeMap.get(rel.userId);
      const parent = nodeMap.get(rel.managerId);
      if (child && parent) {
        child.managerId = rel.managerId;
        parent.directReports.push(child);
        hasManager.add(rel.userId);
      }
    }

    // Collect roots (no manager)
    const roots: OrgTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (!hasManager.has(node.id)) {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Get the full org chart tree for a company, with Redis cache-aside.
   */
  async getTree(companyId: string): Promise<OrgTreeNode[]> {
    // 1. Check Redis cache
    const cacheKey = `org-chart:tree:${companyId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* skip cache on Redis failure */
    }

    // 2. Three parallel queries
    const [memberships, relationships] = await Promise.all([
      this.prisma.userCompanyMembership.findMany({
        where: { companyId, isSuperAdmin: false },
        include: {
          position: { select: { name: true } },
          orgUnit: { select: { name: true } },
        },
      }),
      this.prisma.reportingRelationship.findMany({
        where: { companyId },
        select: { userId: true, managerId: true },
      }),
    ]);

    // Get user IDs from memberships and fetch user/person data
    const userIds = memberships.map(m => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: { select: { fullName: true, email: true } } },
    });

    // 3. Map to flat arrays
    const memberMap = new Map(memberships.map(m => [m.userId, m]));

    const flatEmployees: FlatEmployee[] = users.map(user => {
      const membership = memberMap.get(user.id);
      return {
        userId: user.id,
        fullName: (user as any).person?.fullName ?? user.email,
        email: (user as any).person?.email ?? user.email,
        positionTitle: (membership as any)?.position?.name ?? null,
        departmentName: (membership as any)?.orgUnit?.name ?? null,
      };
    });

    const flatRelationships: FlatRelationship[] = relationships.map(r => ({
      userId: r.userId,
      managerId: r.managerId,
    }));

    // 4. Build tree
    const tree = this.buildTree(flatEmployees, flatRelationships);

    // 5. Cache result
    try {
      await this.redis.set(cacheKey, JSON.stringify(tree), 'EX', 300);
    } catch {
      /* skip cache write on Redis failure */
    }

    return tree;
  }

  /**
   * Get employees and ancestor chain for a specific org unit.
   */
  async getUnitView(companyId: string, unitId: string): Promise<UnitViewResponse> {
    // Get the unit
    const unit = await this.prisma.organizationUnit.findFirst({
      where: { id: unitId, companyId },
      include: { type: { select: { name: true } } },
    });
    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }

    // Get employees in this unit (super admins are not org-chart members)
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { companyId, orgUnitId: unitId, isSuperAdmin: false },
      include: {
        position: { select: { name: true } },
      },
    });

    // Fetch user/person data for the members
    const memberUserIds = memberships.map(m => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      include: { person: { select: { fullName: true } } },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const employees: UnitEmployee[] = memberships.map(m => {
      const user = userMap.get(m.userId);
      return {
        id: m.userId,
        fullName: (user as any)?.person?.fullName ?? user?.email ?? m.userId,
        positionTitle: (m as any).position?.name ?? null,
        status: 'ACTIVE',
      };
    });

    // Walk parent chain
    const parentChain: UnitAncestor[] = [];
    let currentUnit: any = unit;
    while (currentUnit.parentId) {
      const parent = await this.prisma.organizationUnit.findFirst({
        where: { id: currentUnit.parentId, companyId },
        include: { type: { select: { name: true } } },
      });
      if (!parent) break;
      parentChain.unshift({
        id: parent.id,
        name: parent.name,
        typeName: (parent as any).type?.name ?? '',
      });
      currentUnit = parent;
    }

    return {
      unit: {
        id: unit.id,
        name: unit.name,
        typeName: (unit as any).type?.name ?? '',
        managerId: (unit as any).managerId ?? null,
      },
      parentChain,
      employees,
    };
  }

  /**
   * Returns flat array of all people in the company's org chart.
   * Salary is only included if the requesting user is:
   * - super_admin (isSuperAdmin on membership), OR
   * - in the management chain above that person
   */
  async getPeople(companyId: string, requestingUserId: string): Promise<OrgChartPerson[]> {
    // 1. Fetch memberships and relationships in parallel
    const [memberships, relationships] = await Promise.all([
      this.prisma.userCompanyMembership.findMany({
        where: { companyId },
        include: {
          position: { select: { name: true } },
          orgUnit: { select: { id: true, name: true } },
        },
      }),
      this.prisma.reportingRelationship.findMany({
        where: { companyId },
        select: { userId: true, managerId: true },
      }),
    ]);

    // 2. Fetch user/person data
    const userIds = memberships.map(m => m.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: { select: { fullName: true, email: true } } },
    });

    // 3. Build lookup maps
    const userMap = new Map(users.map(u => [u.id, u]));
    const memberMap = new Map(memberships.map(m => [m.userId, m]));
    const relMap = new Map(relationships.map(r => [r.userId, r.managerId]));

    // 4. Determine salary visibility
    const managedUserIds = this.getSubordinateIds(requestingUserId, relationships);

    const requestingMembership = memberships.find(m => m.userId === requestingUserId);
    const isSuperAdmin = requestingMembership?.isSuperAdmin ?? false;

    // 5. Map to OrgChartPerson[] — exclude super admins (account creators), who
    // are not part of the org chart.
    const people: OrgChartPerson[] = users
      .filter(user => !memberMap.get(user.id)?.isSuperAdmin)
      .map(user => {
      const membership = memberMap.get(user.id);
      const parentId = relMap.get(user.id) ?? null;

      const canSeeSalary = isSuperAdmin || managedUserIds.has(user.id);

      return {
        id: user.id,
        fullName: (user as any).person?.fullName ?? user.email,
        title: (membership as any)?.position?.name ?? 'No title',
        squads: [],
        salary: canSeeSalary ? null : null,
        parentId,
        avatarUrl: null,
        departmentId: (membership as any)?.orgUnit?.id ?? null,
        departmentName: (membership as any)?.orgUnit?.name ?? null,
        uin: null,
        status: 'ACTIVE',
        capacityAllocation: canSeeSalary ? 100 : 0,
        positionTitle: (membership as any)?.position?.name ?? null,
      };
    });

    return people;
  }

  /**
   * Get all user IDs that are subordinates (direct or indirect) of a manager.
   */
  private getSubordinateIds(
    managerId: string,
    relationships: { userId: string; managerId: string }[],
  ): Set<string> {
    const childrenMap = new Map<string, string[]>();
    for (const rel of relationships) {
      if (!childrenMap.has(rel.managerId)) {
        childrenMap.set(rel.managerId, []);
      }
      childrenMap.get(rel.managerId)!.push(rel.userId);
    }

    const result = new Set<string>();
    const queue = [managerId];
    while (queue.length > 0) {
      const current = queue.pop()!;
      const children = childrenMap.get(current) ?? [];
      for (const child of children) {
        result.add(child);
        queue.push(child);
      }
    }

    return result;
  }

  /**
   * Invalidate the cached org chart tree for a company.
   */
  async invalidateTree(companyId: string): Promise<void> {
    try {
      await this.redis.del(`org-chart:tree:${companyId}`);
    } catch {
      /* Graceful degradation — log warning, don't throw */
    }
  }
}
