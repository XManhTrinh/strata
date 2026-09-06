import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import {
  AccessRequest,
  AccessDecision,
  EffectivePermission,
} from './authorization.types';
import { PermissionScope, maxScope } from './scope-resolver/scope-resolver.types';
import { ScopeResolverService } from './scope-resolver/scope-resolver.service';
import { PermissionCacheService } from './permission-cache/permission-cache.service';
import { FeatureRegistryService } from './feature-registry/feature-registry.service';

@Injectable()
export class AuthorizationEngine {
  private readonly logger = new Logger(AuthorizationEngine.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly scopeResolver: ScopeResolverService,
    private readonly cacheService: PermissionCacheService,
    private readonly featureRegistry: FeatureRegistryService,
  ) {}

  /**
   * Evaluates an access request through the 5-step authorization pipeline.
   *
   * Step 0: Super Admin bypass
   * Step 2: User has at least one role
   * Step 3: A role grants the required feature:permission
   * Step 4: Feature/permission valid in registry AND feature enabled for company
   * Step 5: Scope resolution (broadest scope covers target)
   *
   * (Step 1 — authentication — is handled by the AuthGuard before this point)
   */
  async evaluate(request: AccessRequest): Promise<AccessDecision> {
    // Step 0: Super Admin bypass
    const isSuperAdmin = await this.checkSuperAdmin(
      request.userId,
      request.companyId,
    );
    if (isSuperAdmin) {
      return { allowed: true, effectiveScope: PermissionScope.COMPANY };
    }

    // Get effective permissions (cached or computed)
    const permissions = await this.getEffectivePermissions(
      request.userId,
      request.companyId,
    );

    // Step 2: Has at least one role?
    if (permissions.length === 0) {
      return { allowed: false, deniedAtStep: 2 };
    }

    // Step 3: Does any permission match the required feature:permission?
    const matchingPermissions = permissions.filter(
      (p) =>
        p.feature === request.feature && p.permission === request.permission,
    );
    if (matchingPermissions.length === 0) {
      return { allowed: false, deniedAtStep: 3 };
    }

    // Step 4: Is the action valid for this feature?
    const isValid = await this.featureRegistry.isValidAction(
      request.feature,
      request.permission,
    );
    if (!isValid) {
      return { allowed: false, deniedAtStep: 4 };
    }

    // Step 4b: Is the feature enabled for this company?
    const isEnabled = await this.featureRegistry.isEnabledForCompany(
      request.feature,
      request.companyId,
    );
    if (!isEnabled) {
      return { allowed: false, deniedAtStep: 4 };
    }

    // Step 5: Scope resolution — take the broadest scope
    const scopes = matchingPermissions.map((p) => p.scope);
    const broadestScope = maxScope(scopes);

    const scopeCoversTarget = await this.scopeResolver.resolve(
      broadestScope,
      request.userId,
      request.companyId,
      request.targetResourceOwnerId,
      request.targetResourceOrgUnitId,
    );

    if (!scopeCoversTarget) {
      return { allowed: false, deniedAtStep: 5 };
    }

    return { allowed: true, effectiveScope: broadestScope };
  }

  /**
   * Evaluates multiple access requests in batch.
   */
  async evaluateBatch(requests: AccessRequest[]): Promise<AccessDecision[]> {
    return Promise.all(requests.map((req) => this.evaluate(req)));
  }

  /**
   * Checks if the user is a super admin for the given company.
   */
  async isSuperAdmin(
    userId: string,
    companyId: string,
  ): Promise<boolean> {
    return this.checkSuperAdmin(userId, companyId);
  }

  /**
   * Checks if a feature is enabled for the given company.
   */
  async isFeatureEnabled(
    featureKey: string,
    companyId: string,
  ): Promise<boolean> {
    return this.featureRegistry.isEnabledForCompany(featureKey, companyId);
  }

  // ─── Private Methods ─────────────────────────────────────────────────────

  /**
   * Checks if the user is a super admin for the given company.
   * Accepts either a Prisma userId or a Supabase userId.
   */
  private async checkSuperAdmin(
    userId: string,
    companyId: string,
  ): Promise<boolean> {
    // Try direct lookup first (Prisma user ID)
    const directMembership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { isSuperAdmin: true },
    });
    if (directMembership) return directMembership.isSuperAdmin === true;

    // Fallback: lookup via Supabase user ID → Prisma user ID
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId: userId },
      select: { id: true },
    });
    if (!user) return false;

    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { isSuperAdmin: true },
    });
    return membership?.isSuperAdmin === true;
  }

  /**
   * Gets effective permissions for a user, using cache when available.
   * On cache miss, computes from DB and stores in cache.
   */
  private async getEffectivePermissions(
    userId: string,
    companyId: string,
  ): Promise<EffectivePermission[]> {
    // Try cache first
    const cached = await this.cacheService.getEffectivePermissions(
      companyId,
      userId,
    );
    if (cached) return cached;

    // Cache miss — compute from database
    const permissions = await this.computeEffectivePermissions(
      userId,
      companyId,
    );

    // Store in cache (fire-and-forget)
    this.cacheService
      .setEffectivePermissions(companyId, userId, permissions)
      .catch((err) =>
        this.logger.warn(`Failed to cache permissions: ${err}`),
      );

    return permissions;
  }

  /**
   * Computes effective permissions from the database by traversing:
   * UserCompanyMembership → RoleAssignment → Role → RolePermission → FeaturePermission → Feature
   */
  private async computeEffectivePermissions(
    userId: string,
    companyId: string,
  ): Promise<EffectivePermission[]> {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { id: true },
    });

    if (!membership) return [];

    const roleAssignments = await this.prisma.roleAssignment.findMany({
      where: { membershipId: membership.id },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                scope: true,
                featurePermission: {
                  select: {
                    key: true,
                    feature: {
                      select: { key: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions: EffectivePermission[] = [];
    for (const assignment of roleAssignments) {
      for (const rolePerm of assignment.role.permissions) {
        permissions.push({
          feature: rolePerm.featurePermission.feature.key,
          permission: rolePerm.featurePermission.key,
          scope: rolePerm.scope as PermissionScope,
        });
      }
    }

    return permissions;
  }
}
