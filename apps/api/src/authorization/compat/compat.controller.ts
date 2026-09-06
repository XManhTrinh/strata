import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthorizationEngine } from '../authorization.engine';
import { FeatureRegistryService } from '../feature-registry/feature-registry.service';
import { PermissionScope } from '../scope-resolver/scope-resolver.types';

/**
 * Scope translation map: old scope names → new scope names.
 * Used for backward-compatible API endpoints.
 */
const SCOPE_MAP_OLD_TO_NEW: Record<string, PermissionScope> = {
  SELF: PermissionScope.OWN,
  TEAM: PermissionScope.DIRECT_REPORTS,
  ORGANIZATION: PermissionScope.COMPANY,
};

const SCOPE_MAP_NEW_TO_OLD: Record<string, string> = {
  [PermissionScope.OWN]: 'SELF',
  [PermissionScope.DIRECT_REPORTS]: 'TEAM',
  [PermissionScope.ORGANIZATION_UNIT]: 'ORGANIZATION',
  [PermissionScope.BRANCH]: 'ORGANIZATION',
  [PermissionScope.COMPANY]: 'ORGANIZATION',
  [PermissionScope.GLOBAL]: 'ORGANIZATION',
};

/**
 * Backward-compatible permission endpoints.
 *
 * This controller provides a thin wrapper at `/api/permissions/v1/*` that
 * translates old scope names and proxies queries to the new authorization engine.
 * Usage is logged for sunset tracking.
 *
 * Deprecated: Will be removed in a future version once all clients migrate
 * to the v2 authorization API.
 */
@Controller('permissions/v1')
export class CompatController {
  private readonly logger = new Logger(CompatController.name);

  constructor(
    private readonly authorizationEngine: AuthorizationEngine,
    private readonly featureRegistry: FeatureRegistryService,
  ) {}

  /**
   * Check if a user has a specific permission (v1 format).
   * Translates old scope names to new ones and delegates to the engine.
   *
   * POST /permissions/v1/check
   * Body: { userId, companyId, resource, action, scope }
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkPermission(
    @Body()
    body: {
      userId?: string;
      companyId?: string;
      resource?: string;
      action?: string;
      scope?: string;
      targetResourceOwnerId?: string;
    },
  ) {
    this.logDeprecatedUsage('POST /permissions/v1/check');

    const { userId, companyId, resource, action, scope, targetResourceOwnerId } = body;

    if (!userId || !companyId || !resource || !action) {
      throw new BadRequestException(
        'Missing required fields: userId, companyId, resource, action',
      );
    }

    // Translate old format: resource → feature, action → permission
    const feature = resource;
    const permission = action;

    const decision = await this.authorizationEngine.evaluate({
      userId,
      companyId,
      feature,
      permission,
      targetResourceOwnerId,
    });

    // Translate the response back to v1 format
    return {
      allowed: decision.allowed,
      scope: decision.effectiveScope
        ? SCOPE_MAP_NEW_TO_OLD[decision.effectiveScope] ?? decision.effectiveScope
        : scope ?? null,
      deniedReason: decision.allowed
        ? null
        : `Denied at evaluation step ${decision.deniedAtStep}`,
    };
  }

  /**
   * Get all features/permissions available in the system (v1 format).
   * Returns permissions as resource:action pairs.
   *
   * GET /permissions/v1/available
   */
  @Get('available')
  async getAvailablePermissions() {
    this.logDeprecatedUsage('GET /permissions/v1/available');

    const features = this.featureRegistry.getAll();

    // Translate to old format: { resource, action } pairs
    const permissions: Array<{ resource: string; action: string }> = [];
    for (const feature of features) {
      for (const perm of feature.permissions) {
        permissions.push({
          resource: feature.key,
          action: perm.key,
        });
      }
    }

    return { permissions };
  }

  /**
   * Get available scopes (v1 format names).
   *
   * GET /permissions/v1/scopes
   */
  @Get('scopes')
  async getScopes() {
    this.logDeprecatedUsage('GET /permissions/v1/scopes');

    return {
      scopes: ['SELF', 'TEAM', 'ORGANIZATION'],
      note: 'These are legacy scope names. Use the v2 API for the full scope set (OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, GLOBAL).',
    };
  }

  /**
   * Translate a v1 scope name to its v2 equivalent.
   *
   * GET /permissions/v1/scopes/translate/:scope
   */
  @Get('scopes/translate/:scope')
  async translateScope(@Param('scope') scope: string) {
    this.logDeprecatedUsage(`GET /permissions/v1/scopes/translate/${scope}`);

    const upperScope = scope.toUpperCase();
    const v2Scope = SCOPE_MAP_OLD_TO_NEW[upperScope];

    if (!v2Scope) {
      throw new BadRequestException(
        `Unknown v1 scope: "${scope}". Valid v1 scopes: SELF, TEAM, ORGANIZATION`,
      );
    }

    return {
      v1Scope: upperScope,
      v2Scope,
    };
  }

  /**
   * Logs usage of deprecated v1 endpoints for sunset tracking.
   */
  private logDeprecatedUsage(endpoint: string): void {
    this.logger.warn(
      `[DEPRECATED] v1 compat endpoint accessed: ${endpoint}. ` +
        `Clients should migrate to the v2 authorization API.`,
    );
  }
}
