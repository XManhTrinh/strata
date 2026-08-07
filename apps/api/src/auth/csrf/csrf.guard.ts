import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Skip if no access_token cookie (API key auth, not cookie-based)
    if (!request.cookies?.['access_token']) {
      return true;
    }

    const headerToken = request.headers['x-csrf-token'] as string;
    const cookieToken = request.cookies?.['csrf_token'];

    if (!headerToken || !cookieToken) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }

    // Timing-safe comparison
    const headerBuf = Buffer.from(headerToken);
    const cookieBuf = Buffer.from(cookieToken);

    if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }

    return true;
  }
}
