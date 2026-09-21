import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RegisterFeature } from '../authorization/feature-registry/feature-registry.decorator';
import { CalendarController } from './controllers/calendar.controller';
import { LeaveController } from './controllers/leave.controller';
import { LeaveTypeController } from './controllers/leave-type.controller';
import { EventTypeController } from './controllers/event-type.controller';
import { BalanceController } from './controllers/balance.controller';
import { AccrualPolicyController } from './controllers/accrual-policy.controller';
import { CalendarService } from './services/calendar.service';
import { LeaveService } from './services/leave.service';
import { BalanceService } from './services/balance.service';
import { AccrualService } from './services/accrual.service';
import { SeedDefaultsService } from './services/seed-defaults.service';
import { CalendarRepository } from './repository/calendar.repository';
import { AccrualWorker } from './workers/accrual.worker';
import { NotificationWorker } from './workers/notification.worker';

@RegisterFeature({
  key: 'calendar',
  displayName: 'Calendar & Leave Management',
  description: 'Unified calendar, leave requests, balance tracking, and scheduling',
  permissions: [
    { key: 'read', displayName: 'View Calendar', description: 'View calendar events and leave requests' },
    { key: 'create', displayName: 'Create Leave Requests', description: 'Submit new leave requests' },
    { key: 'cancel', displayName: 'Cancel Leave Requests', description: 'Cancel own leave requests' },
    { key: 'approve', displayName: 'Approve Leave Requests', description: 'Approve leave requests for direct reports' },
    { key: 'reject', displayName: 'Reject Leave Requests', description: 'Reject leave requests for direct reports' },
  ],
})
@Module({
  imports: [AuthModule],
  controllers: [
    CalendarController,
    LeaveController,
    LeaveTypeController,
    EventTypeController,
    BalanceController,
    AccrualPolicyController,
  ],
  providers: [
    CalendarService,
    LeaveService,
    BalanceService,
    AccrualService,
    SeedDefaultsService,
    CalendarRepository,
    AccrualWorker,
    NotificationWorker,
  ],
  exports: [CalendarService, LeaveService, BalanceService, SeedDefaultsService],
})
export class CalendarModule {}
