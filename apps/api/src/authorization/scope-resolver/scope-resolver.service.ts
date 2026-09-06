import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { PermissionScope } from './scope-resolver.types';
import { ScopeResolverCache } from './scope-resolver.cache';

@Injectable()
export class ScopeResolverService {
  private readonly logger = new Logger(ScopeResolverService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: ScopeResolverCache,
  ) {}

  /**
   * Resolves whether the target resource falls within the actor's permitted scope.
   *
   * @param scope - The permission scope to evaluate
   * @param actorUserId - The requesting user's ID
   * @param actorCompanyId - The requesting user's company ID
   * @param targetResourceOwnerId - The owner user ID of the target resource
   * @param targetResourceOrgUnitId - The org unit ID of the target resource
   * @returns true if the scope covers the target resource
   */
  async resolve(
    scope: PermissionScope,
    actorUserId: string,
    actorCompanyId: string,
    targetResourceOwnerId?: string,
    targetResourceOrgUnitId?: string,
  ): Promise<boolean> {
    switch (scope) {
      case PermissionScope.GLOBAL:
        return true;

      case PermissionScope.COMPANY:
        return this.resolveCompany(actorCompanyId, targetResourceOwnerId);

      case PermissionScope.BRANCH:
        return this.resolveBranch(
          actorUserId,
          actorCompanyId,
          targetResourceOwnerId,
          targetResourceOrgUnitId,
        );

      case PermissionScope.ORGANIZATION_UNIT:
        return this.resolveOrganizationUnit(
          actorUserId,
          actorCompanyId,
          targetResourceOwnerId,
          targetResourceOrgUnitId,
        );

      case PermissionScope.DIRECT_REPORTS:
        return this.resolveDirectReports(
          actorUserId,
          actorCompanyId,
          targetResourceOwnerId,
        );

      case PermissionScope.OWN:
        return this.resolveOwn(actorUserId, targetResourceOwnerId);

      default:
        this.logger.warn(`Unknown scope: ${scope}`);
        return false;
    }
  }

  /**
   * Returns all user IDs accessible to the actor for a given scope.
   */
  async getUserIdsInScope(
    scope: PermissionScope,
    actorUserId: string,
    actorCompanyId: string,
  ): Promise<string[]> {
    switch (scope) {
      case PermissionScope.GLOBAL:
        // All users across all companies
        const allUsers = await this.prisma.userCompanyMembership.findMany({
          select: { userId: true },
        });
        return allUsers.map((u) => u.userId);

      case PermissionScope.COMPANY:
        const companyUsers =
          await this.prisma.userCompanyMembership.findMany({
            where: { companyId: actorCompanyId },
            select: { userId: true },
          });
        return companyUsers.map((u) => u.userId);

      case PermissionScope.BRANCH:
        return this.getUserIdsInBranch(actorUserId, actorCompanyId);

      case PermissionScope.ORGANIZATION_UNIT:
        return this.getUserIdsInOrgUnit(actorUserId, actorCompanyId);

      case PermissionScope.DIRECT_REPORTS:
        return this.getUserIdsInDirectReports(actorUserId, actorCompanyId);

      case PermissionScope.OWN:
        return [actorUserId];

      default:
        return [];
    }
  }

  // ─── Private Resolution Methods ──────────────────────────────────────────

  private resolveOwn(
    actorUserId: string,
    targetResourceOwnerId?: string,
  ): boolean {
    if (!targetResourceOwnerId) return true; // No target owner = allow (self-action)
    return actorUserId === targetResourceOwnerId;
  }

  private async resolveDirectReports(
    actorUserId: string,
    actorCompanyId: string,
    targetResourceOwnerId?: string,
  ): Promise<boolean> {
    if (!targetResourceOwnerId) return true;
    if (actorUserId === targetResourceOwnerId) return true;

    const directReportIds = await this.cache.getDirectReportUserIds(
      actorCompanyId,
      actorUserId,
    );

    return directReportIds.includes(targetResourceOwnerId);
  }

  private async resolveOrganizationUnit(
    actorUserId: string,
    actorCompanyId: string,
    targetResourceOwnerId?: string,
    targetResourceOrgUnitId?: string,
  ): Promise<boolean> {
    if (!targetResourceOwnerId && !targetResourceOrgUnitId) return true;

    const actorMembership =
      await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: { userId: actorUserId, companyId: actorCompanyId },
        },
        select: { orgUnitId: true },
      });

    if (!actorMembership?.orgUnitId) return false;

    // If target org unit ID is provided directly, compare
    if (targetResourceOrgUnitId) {
      return actorMembership.orgUnitId === targetResourceOrgUnitId;
    }

    // Otherwise, look up the target user's org unit
    if (targetResourceOwnerId) {
      const targetMembership =
        await this.prisma.userCompanyMembership.findUnique({
          where: {
            userId_companyId: {
              userId: targetResourceOwnerId,
              companyId: actorCompanyId,
            },
          },
          select: { orgUnitId: true },
        });

      return targetMembership?.orgUnitId === actorMembership.orgUnitId;
    }

    return false;
  }

  private async resolveBranch(
    actorUserId: string,
    actorCompanyId: string,
    targetResourceOwnerId?: string,
    targetResourceOrgUnitId?: string,
  ): Promise<boolean> {
    if (!targetResourceOwnerId && !targetResourceOrgUnitId) return true;

    const actorMembership =
      await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: { userId: actorUserId, companyId: actorCompanyId },
        },
        select: { orgUnitId: true },
      });

    if (!actorMembership?.orgUnitId) return false;

    // Get all descendant org unit IDs (including actor's own unit)
    const branchUnitIds = await this.cache.getDescendantOrgUnitIds(
      actorCompanyId,
      actorMembership.orgUnitId,
    );

    // If target org unit is specified directly
    if (targetResourceOrgUnitId) {
      return branchUnitIds.includes(targetResourceOrgUnitId);
    }

    // Otherwise, look up the target user's org unit
    if (targetResourceOwnerId) {
      const targetMembership =
        await this.prisma.userCompanyMembership.findUnique({
          where: {
            userId_companyId: {
              userId: targetResourceOwnerId,
              companyId: actorCompanyId,
            },
          },
          select: { orgUnitId: true },
        });

      if (!targetMembership?.orgUnitId) return false;
      return branchUnitIds.includes(targetMembership.orgUnitId);
    }

    return false;
  }

  private async resolveCompany(
    actorCompanyId: string,
    targetResourceOwnerId?: string,
  ): Promise<boolean> {
    if (!targetResourceOwnerId) return true;

    // Check if target user belongs to the same company
    const targetMembership =
      await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: targetResourceOwnerId,
            companyId: actorCompanyId,
          },
        },
        select: { id: true },
      });

    return targetMembership !== null;
  }

  // ─── Private getUserIdsIn* Methods ──────────────────────────────────────

  private async getUserIdsInDirectReports(
    actorUserId: string,
    actorCompanyId: string,
  ): Promise<string[]> {
    const reportIds = await this.cache.getDirectReportUserIds(
      actorCompanyId,
      actorUserId,
    );
    return [actorUserId, ...reportIds];
  }

  private async getUserIdsInOrgUnit(
    actorUserId: string,
    actorCompanyId: string,
  ): Promise<string[]> {
    const actorMembership =
      await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: { userId: actorUserId, companyId: actorCompanyId },
        },
        select: { orgUnitId: true },
      });

    if (!actorMembership?.orgUnitId) return [actorUserId];

    const members = await this.prisma.userCompanyMembership.findMany({
      where: {
        companyId: actorCompanyId,
        orgUnitId: actorMembership.orgUnitId,
      },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }

  private async getUserIdsInBranch(
    actorUserId: string,
    actorCompanyId: string,
  ): Promise<string[]> {
    const actorMembership =
      await this.prisma.userCompanyMembership.findUnique({
        where: {
          userId_companyId: { userId: actorUserId, companyId: actorCompanyId },
        },
        select: { orgUnitId: true },
      });

    if (!actorMembership?.orgUnitId) return [actorUserId];

    const branchUnitIds = await this.cache.getDescendantOrgUnitIds(
      actorCompanyId,
      actorMembership.orgUnitId,
    );

    const members = await this.prisma.userCompanyMembership.findMany({
      where: {
        companyId: actorCompanyId,
        orgUnitId: { in: branchUnitIds },
      },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }
}
