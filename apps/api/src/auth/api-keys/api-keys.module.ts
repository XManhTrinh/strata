import { Module } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

const PrismaProvider = {
  provide: PrismaClient,
  useFactory: () => new PrismaClient(),
};

@Module({
  controllers: [ApiKeysController],
  providers: [PrismaProvider, ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
