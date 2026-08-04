import { Module } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';

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
  controllers: [OidcController],
  providers: [PrismaProvider, RedisProvider, OidcService],
  exports: [OidcService],
})
export class OidcModule {}
