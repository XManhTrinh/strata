import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from './permissions.decorator';
import { PermissionsService } from './permissions.service';
import { hasPermission } from './permissions.domain';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
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

    // Check if the endpoint has a permission requirement
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission decorator is applied, allow access (only auth guard applies)
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User context not found');
    }

    const userPermissions = await this.permissionsService.getUserPermissions(
      user.sub,
    );

    const allowed = hasPermission(
      userPermissions,
      required.action,
      required.resource,
      required.scope,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Insufficient permissions: requires ${required.action} on ${required.resource} with scope ${required.scope}`,
      );
    }

    return true;
  }
}
