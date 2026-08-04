import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveDomain } from './leave.domain';
import { LeaveRepository } from './leave.repository';

@Module({
  imports: [AuthModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveDomain, LeaveRepository],
  exports: [LeaveService],
})
export class LeaveModule {}
