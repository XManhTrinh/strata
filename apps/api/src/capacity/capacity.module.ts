import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';

@Module({
  imports: [AuthModule],
  controllers: [CapacityController],
  providers: [CapacityService],
  exports: [CapacityService],
})
export class CapacityModule {}
