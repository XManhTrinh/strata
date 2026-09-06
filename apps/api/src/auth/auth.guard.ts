import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ApiKeysService } from './api-keys/api-keys.service';
import * as jose from 'jose';

const API_KEY_PREFIX = 'strata_';

// Cached JWKS remote key set — fetched once, auto-refreshes on key rotation
let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS() {
  if (jwks) return jwks;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  // Supabase JWKS endpoint requires the apikey header
  const url = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
  jwks = jose.createRemoteJWKSet(url, {
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY || '',
    },
  });
  return jwks;
}

/**
 * Global authentication guard.
 *
 * Authentication strategy (in order):
 * 1. Routes marked @Public() are allowed through without auth.
 * 2. Bearer tokens starting with "strata_" are validated as API keys.
 * 3. All other Bearer tokens are verified as Supabase JWTs using
 *    local JWKS verification (no per-request network call to Supabase).
 *
 * On success the decoded user is attached to `request.user` with shape
 * `{ sub: string; email: string }`.
 */
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

    // API key authentication
    if (token.startsWith(API_KEY_PREFIX)) {
      return this.validateApiKey(request, token);
    }

    // Supabase JWT authentication — local JWKS verification
    return this.validateSupabaseToken(request, token);
  }

  private async validateSupabaseToken(
    request: Request,
    token: string,
  ): Promise<boolean> {
    try {
      const keySet = getJWKS();
      const { payload } = await jose.jwtVerify(token, keySet);

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }

      // Preserve the same user payload shape for downstream compatibility
      (request as any).user = {
        sub: payload.sub,
        email: payload.email as string,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
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
