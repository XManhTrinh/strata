import { Module } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
