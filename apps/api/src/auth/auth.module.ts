import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiKeysService } from './api-keys/api-keys.service';

const PrismaProvider = {
  provide: PrismaClient,
  useFactory: () => new PrismaClient(),
};

const RedisProvider = {
  provide: Redis,
  useFactory: () =>
    new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    }),
};

@Module({
  imports: [ApiKeysModule],
  controllers: [AuthController],
  providers: [
    PrismaProvider,
    RedisProvider,
    AuthService,
    ApiKeysService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [PrismaClient, Redis, AuthService, ApiKeysService],
})
export class AuthModule {}
