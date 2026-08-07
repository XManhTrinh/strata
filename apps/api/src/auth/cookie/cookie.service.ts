import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CookieService {
  private isLocalhost(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private getCookieOptions(cookieType: 'access' | 'refresh' | 'csrf') {
    const isLocal = this.isLocalhost();
    const base = {
      httpOnly: cookieType !== 'csrf',
      secure: !isLocal,
      sameSite: isLocal ? ('lax' as const) : ('none' as const),
      path: cookieType === 'refresh' ? '/auth' : '/',
    };

    const maxAge = {
      access: 900, // 15 minutes
      refresh: 604800, // 7 days
      csrf: 604800, // 7 days
    };

    return { ...base, maxAge: maxAge[cookieType] * 1000 }; // express uses ms
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access_token', accessToken, this.getCookieOptions('access'));
    res.cookie('refresh_token', refreshToken, this.getCookieOptions('refresh'));
  }

  setCsrfCookie(res: Response, csrfToken: string): void {
    res.cookie('csrf_token', csrfToken, this.getCookieOptions('csrf'));
  }

  clearAuthCookies(res: Response): void {
    const clearOptions = { maxAge: 0 };
    res.cookie('access_token', '', { ...this.getCookieOptions('access'), ...clearOptions });
    res.cookie('refresh_token', '', { ...this.getCookieOptions('refresh'), ...clearOptions });
    res.cookie('csrf_token', '', { ...this.getCookieOptions('csrf'), ...clearOptions });
  }

  getAccessToken(req: Request): string | undefined {
    return req.cookies?.['access_token'];
  }

  getRefreshToken(req: Request): string | undefined {
    return req.cookies?.['refresh_token'];
  }

  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
