import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@strata/database';
import { signAccessToken } from '@strata/auth';
import { randomBytes, randomUUID, createHash } from 'crypto';
import Redis from 'ioredis';
import { Public } from '../public.decorator';
import { CookieService } from '../cookie/cookie.service';
import { OidcService } from './oidc.service';

const SSO_STATE_TTL_SECONDS = 600; // 10 minutes

interface GoogleOAuthState {
  returnUrl: string;
  nonce: string;
  codeVerifier: string;
}

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaClient,
    private readonly cookieService: CookieService,
    private readonly oidcService: OidcService,
  ) {}

  private get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private get callbackUrl(): string {
    return process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';
  }

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'default-secret';
  }

  /**
   * Initiates the Google OAuth flow with PKCE.
   */
  @Public()
  @Get('login')
  async login(
    @Query('returnUrl') returnUrl: string = '/',
    @Res() res: Response,
  ) {
    // Generate PKCE code_verifier (43-128 chars from unreserved URI chars)
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const nonce = randomBytes(16).toString('hex');
    const stateKey = randomBytes(32).toString('hex');

    const state: GoogleOAuthState = {
      returnUrl,
      nonce,
      codeVerifier,
    };

    // Store state in Redis with 10-minute TTL
    await this.redis.set(
      `sso:state:${stateKey}`,
      JSON.stringify(state),
      'EX',
      SSO_STATE_TTL_SECONDS,
    );

    // Build Google authorization URL
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: this.callbackUrl,
      state: stateKey,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.redirect(authorizationUrl);
  }

  /**
   * Handles the Google OAuth callback.
   */
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') stateKey: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!code || !stateKey) {
      res.redirect(`${frontendUrl}/login?error=missing_params`);
      return;
    }

    try {
      // Retrieve and validate state from Redis
      const stateJson = await this.redis.get(`sso:state:${stateKey}`);
      if (!stateJson) {
        res.redirect(`${frontendUrl}/login?error=invalid_or_expired_state`);
        return;
      }

      // Delete state to prevent replay
      await this.redis.del(`sso:state:${stateKey}`);

      const state: GoogleOAuthState = JSON.parse(stateJson);

      // Exchange code for tokens with PKCE code_verifier
      const tokenResponse = await this.exchangeCodeForTokens(code, state.codeVerifier);

      // Validate and extract claims from ID token
      const claims = await this.oidcService.validateIdToken(tokenResponse.id_token, {
        issuerUrl: 'https://accounts.google.com',
        clientId: this.clientId,
      });

      // Find or create user
      const user = await this.findOrCreateGoogleUser(claims);

      // Issue access token
      const accessToken = signAccessToken(
        { sub: user.id, email: user.email },
        this.jwtSecret,
      );

      // Create refresh token
      const refreshTokenValue = randomUUID();
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.refreshToken.create({
        data: {
          token: refreshTokenValue,
          userId: user.id,
          expiresAt: refreshExpiresAt,
        },
      });

      // Set cookies and redirect
      this.cookieService.setAuthCookies(res, accessToken, refreshTokenValue);
      this.cookieService.setCsrfCookie(res, this.cookieService.generateCsrfToken());

      res.redirect(`${frontendUrl}${state.returnUrl}`);
    } catch (error: any) {
      const message = error?.message || 'Google authentication failed';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }
  }

  private generateCodeVerifier(): string {
    // Generate a 43-character code verifier from unreserved URI characters
    const unreserved = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const bytes = randomBytes(43);
    let verifier = '';
    for (let i = 0; i < 43; i++) {
      verifier += unreserved[bytes[i] % unreserved.length];
    }
    return verifier;
  }

  private generateCodeChallenge(codeVerifier: string): string {
    // code_challenge = base64url(SHA-256(code_verifier)) without padding
    const hash = createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<{ id_token: string; access_token: string }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.callbackUrl,
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new BadRequestException(`Failed to exchange authorization code: ${errorBody}`);
    }

    return response.json() as Promise<{ id_token: string; access_token: string }>;
  }

  private async findOrCreateGoogleUser(
    claims: { sub: string; email: string; name?: string; given_name?: string; family_name?: string },
  ): Promise<{ id: string; email: string }> {
    // First try to find by Google subject ID
    const existingBySso = await this.prisma.user.findFirst({
      where: {
        ssoProviderId: 'google',
        ssoSubjectId: claims.sub,
      },
    });

    if (existingBySso) {
      return { id: existingBySso.id, email: existingBySso.email };
    }

    // Then try to find by email
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: claims.email },
    });

    if (existingByEmail) {
      // Link the existing user to Google
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          ssoProviderId: 'google',
          ssoSubjectId: claims.sub,
        },
      });
      return { id: existingByEmail.id, email: existingByEmail.email };
    }

    // Auto-provision: create Person + User
    const fullName =
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
      claims.email.split('@')[0];

    const person = await this.prisma.person.create({
      data: {
        fullName,
        email: claims.email,
        dateOfBirth: new Date('1970-01-01'), // Placeholder for OAuth-provisioned users
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: claims.email,
        passwordHash: '', // OAuth users don't have a password
        personId: person.id,
        ssoProviderId: 'google',
        ssoSubjectId: claims.sub,
      },
    });

    return { id: user.id, email: user.email };
  }
}
