import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { OidcModule } from './oidc/oidc.module';
import { SsoAdminModule } from './sso-admin/sso-admin.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiKeysService } from './api-keys/api-keys.service';
import { CookieModule } from './cookie/cookie.module';
import { CookieService } from './cookie/cookie.service';
import { GoogleController } from './oidc/google.controller';

const PrismaProvider = {
  provide: PrismaClient,
  useFactory: () => {
    const prisma = new PrismaClient();
    return prisma;
  },
};

const RedisProvider = {
  provide: Redis,
  useFactory: () => {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    return redis;
  },
};

@Module({
  imports: [OidcModule, SsoAdminModule, ApiKeysModule, CookieModule],
  controllers: [AuthController, GoogleController],
  providers: [
    PrismaProvider,
    RedisProvider,
    AuthService,
    ApiKeysService,
    CookieService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [PrismaClient, Redis, AuthService, ApiKeysService, CookieService],
})
export class AuthModule {}
