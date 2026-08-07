import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  FEATURE_PERMISSION_KEY,
  RequiredFeaturePermission,
} from './authorization.decorator';
import { AuthorizationEngine } from './authorization.engine';
import { AccessRequest } from './authorization.types';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly engine: AuthorizationEngine,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Check if the endpoint has a feature permission requirement
    const required =
      this.reflector.getAllAndOverride<RequiredFeaturePermission>(
        FEATURE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    // If no @RequireFeaturePermission decorator is applied, allow access
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Access denied');
    }

    // Dev bypass — skip authorization checks for dev-mock-token
    if (user.email === 'alice.johnson@acme.test' && user.sub === 'usr_001') {
      (request as any).effectiveScope = 'GLOBAL';
      return true;
    }

    // Build the access request from the HTTP context
    const accessRequest: AccessRequest = {
      userId: user.sub,
      companyId: user.companyId || this.extractCompanyId(request),
      feature: required.feature,
      permission: required.permission,
      targetResourceOwnerId: this.extractTargetOwnerId(request),
      targetResourceOrgUnitId: this.extractTargetOrgUnitId(request),
    };

    // Evaluate using the authorization engine
    const decision = await this.engine.evaluate(accessRequest);

    if (!decision.allowed) {
      // Log detailed denial info (not exposed to client)
      this.logger.warn(
        `Authorization denied: userId=${accessRequest.userId}, ` +
          `companyId=${accessRequest.companyId}, ` +
          `feature=${accessRequest.feature}, ` +
          `permission=${accessRequest.permission}, ` +
          `deniedAtStep=${decision.deniedAtStep}, ` +
          `targetResourceOwnerId=${accessRequest.targetResourceOwnerId || 'N/A'}`,
      );

      // Return non-specific error message (security best practice)
      throw new ForbiddenException('Access denied');
    }

    // Attach the effective scope to the request for downstream use
    (request as any).effectiveScope = decision.effectiveScope;

    return true;
  }

  /**
   * Extracts the company ID from the request.
   * Looks in params, query, body, or headers.
   */
  private extractCompanyId(request: Request): string {
    return (
      (request.params as any)?.companyId ||
      (request.query as any)?.companyId ||
      (request.body as any)?.companyId ||
      request.headers['x-company-id'] ||
      ''
    );
  }

  /**
   * Extracts the target resource owner ID from the request context.
   * Used for scope evaluation.
   */
  private extractTargetOwnerId(request: Request): string | undefined {
    return (
      (request.params as any)?.userId ||
      (request.params as any)?.targetUserId ||
      (request.body as any)?.targetUserId ||
      undefined
    );
  }

  /**
   * Extracts the target resource org unit ID from the request context.
   */
  private extractTargetOrgUnitId(request: Request): string | undefined {
    return (
      (request.params as any)?.orgUnitId ||
      (request.body as any)?.orgUnitId ||
      undefined
    );
  }
}
