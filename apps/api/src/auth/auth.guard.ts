import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verifyToken } from '@strata/auth';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ApiKeysService } from './api-keys/api-keys.service';

const API_KEY_PREFIX = 'strata_';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService?: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    // Check if token is an API key
    if (token.startsWith(API_KEY_PREFIX)) {
      return this.validateApiKey(request, token);
    }

    // Dev bypass — allow the mock token from frontend dev login
    if (token === 'dev-mock-token') {
      (request as any).user = {
        sub: 'usr_001',
        email: 'alice.johnson@acme.test',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };
      return true;
    }

    // Default: validate as JWT
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const payload = verifyToken(token, secret);
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private async validateApiKey(
    request: Request,
    token: string,
  ): Promise<boolean> {
    if (!this.apiKeysService) {
      throw new UnauthorizedException(
        'API key authentication is not available',
      );
    }

    try {
      const payload = await this.apiKeysService.validateKey(token);
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired API key');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
