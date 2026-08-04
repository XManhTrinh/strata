import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OidcService } from '../oidc/oidc.service';

// Mock @strata/auth
jest.mock('@strata/auth', () => ({
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-random-hex'),
  }),
  randomUUID: jest.fn().mockReturnValue('mock-uuid-refresh'),
}));

describe('OidcService', () => {
  let service: OidcService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      sSOConfig: {
        findUnique: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      person: {
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
      },
    };

    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };

    service = new OidcService(mockPrisma, mockRedis);
  });

  describe('initiateLogin', () => {
    it('should throw NotFoundException when SSO is not configured', async () => {
      mockPrisma.sSOConfig.findUnique.mockResolvedValue(null);

      await expect(service.initiateLogin('org-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when SSO is disabled', async () => {
      mockPrisma.sSOConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        organizationId: 'org-123',
        enabled: false,
        clientId: 'client-id',
        issuerUrl: 'https://idp.example.com',
        callbackUrl: 'https://app.example.com/auth/sso/callback',
      });

      await expect(service.initiateLogin('org-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return authorization URL and store state in Redis', async () => {
      mockPrisma.sSOConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        organizationId: 'org-123',
        enabled: true,
        clientId: 'my-client-id',
        clientSecret: 'secret',
        issuerUrl: 'https://idp.example.com',
        callbackUrl: 'https://app.example.com/auth/sso/callback',
      });

      const result = await service.initiateLogin('org-123', '/dashboard');

      expect(result).toContain('https://idp.example.com/authorize');
      expect(result).toContain('client_id=my-client-id');
      expect(result).toContain('response_type=code');
      expect(result).toContain('scope=openid+email+profile');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('sso:state:'),
        expect.any(String),
        'EX',
        600,
      );
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('should construct a proper authorization URL', () => {
      const config = {
        clientId: 'test-client',
        issuerUrl: 'https://auth.example.com',
        callbackUrl: 'https://app.example.com/callback',
      };

      const url = service.buildAuthorizationUrl(config, 'state123', 'nonce456');

      expect(url).toBe(
        'https://auth.example.com/authorize?client_id=test-client&response_type=code&scope=openid+email+profile&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&state=state123&nonce=nonce456',
      );
    });

    it('should strip trailing slash from issuer URL', () => {
      const config = {
        clientId: 'test-client',
        issuerUrl: 'https://auth.example.com/',
        callbackUrl: 'https://app.example.com/callback',
      };

      const url = service.buildAuthorizationUrl(config, 'state', 'nonce');
      expect(url).toContain('https://auth.example.com/authorize');
      expect(url).not.toContain('//authorize');
    });
  });

  describe('validateIdToken', () => {
    const config = {
      issuerUrl: 'https://auth.example.com',
      clientId: 'my-client',
    };

    it('should reject tokens with invalid format', async () => {
      await expect(
        service.validateIdToken('not-a-jwt', config),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject tokens missing required claims', async () => {
      const payload = Buffer.from(JSON.stringify({ foo: 'bar' })).toString(
        'base64url',
      );
      const token = `header.${payload}.signature`;

      await expect(service.validateIdToken(token, config)).rejects.toThrow(
        'ID token missing required claims',
      );
    });

    it('should reject expired tokens', async () => {
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600,
        }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;

      await expect(service.validateIdToken(token, config)).rejects.toThrow(
        'ID token has expired',
      );
    });

    it('should reject tokens with issuer mismatch', async () => {
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@example.com',
          iss: 'https://other.example.com',
        }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;

      await expect(service.validateIdToken(token, config)).rejects.toThrow(
        'ID token issuer mismatch',
      );
    });

    it('should successfully validate a proper token', async () => {
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          iss: 'https://auth.example.com',
          aud: 'my-client',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;

      const claims = await service.validateIdToken(token, config);

      expect(claims).toEqual({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        given_name: undefined,
        family_name: undefined,
        picture: undefined,
      });
    });
  });

  describe('findOrCreateUser', () => {
    const claims = {
      sub: 'ext-user-123',
      email: 'sso@example.com',
      name: 'SSO User',
    };

    it('should return existing user matched by SSO subject ID', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'sso@example.com',
      });

      const result = await service.findOrCreateUser(claims, 'org-123');

      expect(result).toEqual({ id: 'user-1', email: 'sso@example.com' });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { ssoProviderId: 'org-123', ssoSubjectId: 'ext-user-123' },
      });
    });

    it('should link existing user found by email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'sso@example.com',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.findOrCreateUser(claims, 'org-123');

      expect(result).toEqual({ id: 'user-2', email: 'sso@example.com' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { ssoProviderId: 'org-123', ssoSubjectId: 'ext-user-123' },
      });
    });

    it('should throw when auto-provision is disabled and no user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.sSOConfig.findUnique.mockResolvedValue({
        autoProvision: false,
      });

      await expect(
        service.findOrCreateUser(claims, 'org-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-provision a new user when enabled', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.sSOConfig.findUnique.mockResolvedValue({
        autoProvision: true,
      });
      mockPrisma.person.create.mockResolvedValue({ id: 'person-new' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'sso@example.com',
      });

      const result = await service.findOrCreateUser(claims, 'org-123');

      expect(result).toEqual({ id: 'user-new', email: 'sso@example.com' });
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: {
          fullName: 'SSO User',
          email: 'sso@example.com',
          dateOfBirth: new Date('1970-01-01'),
        },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'sso@example.com',
          passwordHash: '',
          personId: 'person-new',
          ssoProviderId: 'org-123',
          ssoSubjectId: 'ext-user-123',
        },
      });
    });
  });

  describe('getConfigStatus', () => {
    it('should return null when no config exists', async () => {
      mockPrisma.sSOConfig.findUnique.mockResolvedValue(null);

      const result = await service.getConfigStatus('org-123');
      expect(result).toBeNull();
    });

    it('should return enabled status and provider', async () => {
      mockPrisma.sSOConfig.findUnique.mockResolvedValue({
        enabled: true,
        provider: 'AZURE_AD',
      });

      const result = await service.getConfigStatus('org-123');
      expect(result).toEqual({ enabled: true, provider: 'AZURE_AD' });
    });
  });

  describe('handleCallback', () => {
    it('should throw BadRequestException when state is expired', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.handleCallback('code123', 'invalid-state'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
