import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { CapacityDomain } from './capacity.domain';
import { CapacityRepository } from './capacity.repository';

@Module({
  imports: [AuthModule],
  controllers: [CapacityController],
  providers: [CapacityService, CapacityDomain, CapacityRepository],
  exports: [CapacityService],
})
export class CapacityModule {}
