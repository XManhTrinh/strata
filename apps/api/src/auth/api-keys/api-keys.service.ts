import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const API_KEY_PREFIX = 'strata_';
const BCRYPT_ROUNDS = 10;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generate a new API key. Returns the full key only once.
   */
  async generateKey(
    userId: string,
    name: string,
    expiresAt?: Date,
  ): Promise<{ id: string; key: string; prefix: string; name: string }> {
    // Generate a random key
    const rawKey = randomBytes(32).toString('base64url');
    const fullKey = `${API_KEY_PREFIX}${rawKey}`;
    const prefix = fullKey.substring(0, 12); // "strata_" + first 5 chars

    // Hash the key for storage
    const keyHash = await bcrypt.hash(fullKey, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name,
        prefix,
        keyHash,
        userId,
        expiresAt: expiresAt || null,
      },
    });

    return {
      id: apiKey.id,
      key: fullKey, // Only returned once at creation time
      prefix,
      name,
    };
  }

  /**
   * List user's API keys (without full key or hash).
   */
  async listKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  /**
   * Revoke (delete) an API key.
   */
  async revokeKey(id: string, userId: string): Promise<{ message: string }> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id } });
    return { message: 'API key revoked successfully' };
  }

  /**
   * Validate an API key and return the associated user.
   * Called by the AuthGuard when the token starts with "strata_".
   */
  async validateKey(
    fullKey: string,
  ): Promise<{ sub: string; email: string }> {
    const prefix = fullKey.substring(0, 12);

    // Find candidate keys by prefix
    const candidates = await this.prisma.apiKey.findMany({
      where: { prefix },
      include: { user: true },
    });

    for (const candidate of candidates) {
      const isValid = await bcrypt.compare(fullKey, candidate.keyHash);
      if (isValid) {
        // Check expiration
        if (candidate.expiresAt && new Date() > candidate.expiresAt) {
          throw new UnauthorizedException('API key has expired');
        }

        // Update last used timestamp
        await this.prisma.apiKey.update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          sub: candidate.user.id,
          email: candidate.user.email,
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
