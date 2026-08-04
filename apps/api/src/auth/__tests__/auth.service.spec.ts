import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth.service';

// Mock @strata/auth
jest.mock('@strata/auth', () => ({
  comparePassword: jest.fn(),
  signAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyToken: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-token'),
}));

import { comparePassword } from '@strata/auth';

const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };

    authService = new AuthService(mockPrisma, mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      personId: 'person-1',
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return tokens on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login('test@example.com', 'correct-password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: 'mock-uuid-token',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await expect(
        authService.login('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      // Should increment Redis counter
      expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:login:test@example.com');
    });

    it('should lock account after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockRedis.incr.mockResolvedValue(5);

      await expect(
        authService.login('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      // Should lock the account
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            isLocked: true,
            failedAttempts: 5,
          }),
        }),
      );
    });

    it('should reject login when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        isLocked: true,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
      };
      mockPrisma.user.findUnique.mockResolvedValue(lockedUser);

      await expect(
        authService.login('test@example.com', 'correct-password'),
      ).rejects.toThrow(HttpException);

      try {
        await authService.login('test@example.com', 'correct-password');
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should reset failed attempts on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await authService.login('test@example.com', 'correct-password');

      expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:login:test@example.com');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { failedAttempts: 0 },
        }),
      );
    });
  });

  describe('refresh', () => {
    const mockStoredToken = {
      id: 'token-1',
      token: 'valid-refresh-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    };

    it('should rotate refresh token and issue new access token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredToken = {
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000), // expired
      };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      await expect(authService.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete the refresh token', async () => {
      const mockStoredToken = {
        id: 'token-1',
        token: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      const result = await authService.logout('refresh-token');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should succeed even if token does not exist', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await authService.logout('nonexistent-token');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockPrisma.refreshToken.delete).not.toHaveBeenCalled();
    });
  });
});
