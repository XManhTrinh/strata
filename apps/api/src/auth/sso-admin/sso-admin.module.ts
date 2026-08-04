import { Module } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { SsoAdminController } from './sso-admin.controller';
import { SsoAdminService } from './sso-admin.service';

const PrismaProvider = {
  provide: PrismaClient,
  useFactory: () => new PrismaClient(),
};

@Module({
  controllers: [SsoAdminController],
  providers: [PrismaProvider, SsoAdminService],
  exports: [SsoAdminService],
})
export class SsoAdminModule {}
