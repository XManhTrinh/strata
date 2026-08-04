import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';

const API_KEY_PREFIX = 'strata_';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token || !token.startsWith(API_KEY_PREFIX)) {
      return false; // Not an API key, let other guards handle it
    }

    try {
      const payload = await this.apiKeysService.validateKey(token);
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

/**
 * Check if a token is an API key based on prefix.
 */
export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}
