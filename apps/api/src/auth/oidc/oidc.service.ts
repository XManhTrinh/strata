import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { signAccessToken } from '@strata/auth';
import { randomBytes, randomUUID } from 'crypto';
import Redis from 'ioredis';
import type {
  OIDCClaims,
  OIDCTokenResponse,
  SSOState,
  OIDCDiscoveryDocument,
} from './oidc.types';

const SSO_STATE_TTL_SECONDS = 600; // 10 minutes

@Injectable()
export class OidcService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'default-secret';
  }

  async initiateLogin(
    organizationId: string,
    returnUrl: string = '/',
  ): Promise<string> {
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.enabled) {
      throw new NotFoundException(
        'SSO is not configured or not enabled for this organization',
      );
    }

    const nonce = randomBytes(16).toString('hex');
    const stateKey = randomBytes(32).toString('hex');

    const state: SSOState = {
      organizationId,
      returnUrl,
      nonce,
    };

    // Store state in Redis with 10-minute TTL
    await this.redis.set(
      `sso:state:${stateKey}`,
      JSON.stringify(state),
      'EX',
      SSO_STATE_TTL_SECONDS,
    );

    return this.buildAuthorizationUrl(config, stateKey, nonce);
  }

  async handleCallback(
    code: string,
    stateKey: string,
  ): Promise<{ accessToken: string; refreshToken: string; returnUrl: string }> {
    // Retrieve and validate state from Redis
    const stateJson = await this.redis.get(`sso:state:${stateKey}`);
    if (!stateJson) {
      throw new BadRequestException(
        'Invalid or expired SSO state. Please try logging in again.',
      );
    }

    // Delete state to prevent replay
    await this.redis.del(`sso:state:${stateKey}`);

    const state: SSOState = JSON.parse(stateJson);

    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId: state.organizationId },
    });

    if (!config || !config.enabled) {
      throw new BadRequestException('SSO configuration is no longer active');
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(config, code);

    // Validate and extract claims from ID token
    const claims = await this.validateIdToken(tokenResponse.id_token, config);

    // Find or create user
    const user = await this.findOrCreateUser(claims, state.organizationId);

    // Issue Strata JWT (same as email/password login)
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

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      returnUrl: state.returnUrl,
    };
  }

  async findOrCreateUser(
    claims: OIDCClaims,
    organizationId: string,
  ): Promise<{ id: string; email: string }> {
    // First try to find by SSO subject ID
    const existingBySso = await this.prisma.user.findFirst({
      where: {
        ssoProviderId: organizationId,
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
      // Link the existing user to SSO
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          ssoProviderId: organizationId,
          ssoSubjectId: claims.sub,
        },
      });
      return { id: existingByEmail.id, email: existingByEmail.email };
    }

    // Check if auto-provision is enabled
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config?.autoProvision) {
      throw new BadRequestException(
        'No existing account found and auto-provisioning is disabled. Contact your administrator.',
      );
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
        dateOfBirth: new Date('1970-01-01'), // Placeholder for SSO-provisioned users
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: claims.email,
        passwordHash: '', // SSO users don't have a password
        personId: person.id,
        ssoProviderId: organizationId,
        ssoSubjectId: claims.sub,
      },
    });

    return { id: user.id, email: user.email };
  }

  buildAuthorizationUrl(
    config: { clientId: string; issuerUrl: string; callbackUrl: string },
    state: string,
    nonce: string,
  ): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: config.callbackUrl,
      state,
      nonce,
    });

    // Use the well-known authorization endpoint pattern
    const issuer = config.issuerUrl.replace(/\/$/, '');
    return `${issuer}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    config: {
      clientId: string;
      clientSecret: string;
      issuerUrl: string;
      callbackUrl: string;
    },
    code: string,
  ): Promise<OIDCTokenResponse> {
    const issuer = config.issuerUrl.replace(/\/$/, '');
    const tokenEndpoint = `${issuer}/oauth/token`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new InternalServerErrorException(
        `Failed to exchange authorization code: ${errorBody}`,
      );
    }

    return response.json() as Promise<OIDCTokenResponse>;
  }

  async validateIdToken(
    token: string,
    config: { issuerUrl: string; clientId: string },
  ): Promise<OIDCClaims> {
    // Decode the ID token payload (base64url)
    // For production, you'd verify the signature against the JWKS endpoint
    // For now, we decode and validate the basic claims structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid ID token format');
    }

    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      );

      // Basic claim validation
      if (!payload.sub || !payload.email) {
        throw new BadRequestException(
          'ID token missing required claims (sub, email)',
        );
      }

      // Validate issuer
      const expectedIssuer = config.issuerUrl.replace(/\/$/, '');
      if (payload.iss && payload.iss !== expectedIssuer) {
        throw new BadRequestException('ID token issuer mismatch');
      }

      // Validate audience
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (payload.aud && !aud.includes(config.clientId)) {
        throw new BadRequestException('ID token audience mismatch');
      }

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new BadRequestException('ID token has expired');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to decode ID token');
    }
  }

  async getConfigStatus(
    organizationId: string,
  ): Promise<{ enabled: boolean; provider: string } | null> {
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) return null;

    return {
      enabled: config.enabled,
      provider: config.provider,
    };
  }

  async fetchDiscoveryDocument(
    issuerUrl: string,
  ): Promise<OIDCDiscoveryDocument> {
    const url = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch OIDC discovery document from ${url}`,
      );
    }

    return response.json() as Promise<OIDCDiscoveryDocument>;
  }
}
