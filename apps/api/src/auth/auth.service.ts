import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '@strata/auth';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'default-secret';
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked && user.lockedUntil) {
      if (new Date() < user.lockedUntil) {
        const remainingMs = user.lockedUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Account is locked. Try again in ${remainingMinutes} minute(s).`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        // Lock has expired, reset
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isLocked: false, lockedUntil: null, failedAttempts: 0 },
        });
        user.isLocked = false;
        user.lockedUntil = null;
        user.failedAttempts = 0;
      }
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedAttempt(user.id, email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user.id, email);

    // Generate tokens
    const accessToken = signAccessToken(
      { sub: user.id, email: user.email },
      this.jwtSecret,
    );

    const refreshTokenValue = randomUUID();
    const refreshExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    // Store refresh token in database
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
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async refresh(refreshToken: string) {
    // Find the refresh token in the database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Clean up expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Rotate: delete old token and create new one
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    const newRefreshTokenValue = randomUUID();
    const refreshExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshTokenValue,
        userId: storedToken.userId,
        expiresAt: refreshExpiresAt,
      },
    });

    // Issue new access token
    const accessToken = signAccessToken(
      { sub: storedToken.user.id, email: storedToken.user.email },
      this.jwtSecret,
    );

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
      expiresIn: 900,
    };
  }

  async logout(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (storedToken) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
    }

    return { message: 'Logged out successfully' };
  }

  private async handleFailedAttempt(
    userId: string,
    email: string,
  ): Promise<void> {
    const redisKey = `ratelimit:login:${email}`;

    // Increment the Redis counter
    const attempts = await this.redis.incr(redisKey);

    // Set TTL on first attempt
    if (attempts === 1) {
      await this.redis.expire(redisKey, RATE_LIMIT_WINDOW_SECONDS);
    }

    // Also update the user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
    });

    // If we've hit the threshold, lock the account
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isLocked: true,
          lockedUntil,
          failedAttempts: attempts,
        },
      });
    }
  }

  private async resetFailedAttempts(
    userId: string,
    email: string,
  ): Promise<void> {
    const redisKey = `ratelimit:login:${email}`;
    await this.redis.del(redisKey);

    await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0 },
    });
  }
}
