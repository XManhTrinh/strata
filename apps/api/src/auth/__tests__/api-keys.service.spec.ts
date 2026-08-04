import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mockRandomKeyBase64url12345678'),
  }),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedkey'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new ApiKeysService(mockPrisma);
  });

  describe('generateKey', () => {
    it('should generate and return a new API key', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        name: 'My API Key',
        prefix: 'strata_mock',
        keyHash: '$2b$10$hashedkey',
        userId: 'user-1',
      });

      const result = await service.generateKey('user-1', 'My API Key');

      expect(result.id).toBe('key-1');
      expect(result.key).toContain('strata_');
      expect(result.prefix).toBeDefined();
      expect(result.name).toBe('My API Key');
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My API Key',
          userId: 'user-1',
          keyHash: '$2b$10$hashedkey',
        }),
      });
    });

    it('should store expiration date when provided', async () => {
      const expiresAt = new Date('2025-12-31');
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-2',
        name: 'Expiring Key',
        prefix: 'strata_mock',
        keyHash: '$2b$10$hashedkey',
        userId: 'user-1',
      });

      await service.generateKey('user-1', 'Expiring Key', expiresAt);

      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt,
        }),
      });
    });
  });

  describe('listKeys', () => {
    it('should return user API keys without hashes', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-1',
          name: 'Key 1',
          prefix: 'strata_abc',
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const result = await service.listKeys('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('keyHash');
      expect(result[0].name).toBe('Key 1');
    });
  });

  describe('revokeKey', () => {
    it('should throw NotFoundException when key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.revokeKey('key-99', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete the key when found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
      mockPrisma.apiKey.delete.mockResolvedValue({});

      const result = await service.revokeKey('key-1', 'user-1');

      expect(result.message).toBe('API key revoked successfully');
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-1' },
      });
    });
  });

  describe('validateKey', () => {
    it('should throw UnauthorizedException when no matching key found', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await expect(
        service.validateKey('strata_invalidkey123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when key hash does not match', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-1',
          prefix: 'strata_inval',
          keyHash: '$2b$10$someotherhash',
          expiresAt: null,
          user: { id: 'user-1', email: 'test@example.com' },
        },
      ]);
      mockCompare.mockResolvedValue(false as never);

      await expect(
        service.validateKey('strata_invalidkey123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when key is expired', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-1',
          prefix: 'strata_valid',
          keyHash: '$2b$10$validhash',
          expiresAt: new Date('2020-01-01'), // Expired
          user: { id: 'user-1', email: 'test@example.com' },
        },
      ]);
      mockCompare.mockResolvedValue(true as never);

      await expect(
        service.validateKey('strata_validkey12345'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user payload when key is valid', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-1',
          prefix: 'strata_valid',
          keyHash: '$2b$10$validhash',
          expiresAt: new Date('2030-12-31'),
          user: { id: 'user-1', email: 'test@example.com' },
        },
      ]);
      mockCompare.mockResolvedValue(true as never);
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await service.validateKey('strata_validkey12345');

      expect(result).toEqual({ sub: 'user-1', email: 'test@example.com' });
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });
});
