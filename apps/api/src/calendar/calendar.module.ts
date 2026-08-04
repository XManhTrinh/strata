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
    { key: 'view_own', displayName: 'View Own Calendar', description: 'View own events and leave' },
    { key: 'view_team', displayName: 'View Team Calendar', description: 'View team members events' },
    { key: 'view_company', displayName: 'View Company Calendar', description: 'View all company events' },
    { key: 'submit_leave', displayName: 'Submit Leave', description: 'Submit leave requests' },
    { key: 'approve_leave', displayName: 'Approve Leave', description: 'Approve/reject leave requests' },
    { key: 'manage_balances', displayName: 'Manage Balances', description: 'Adjust leave balances' },
    { key: 'manage_policies', displayName: 'Manage Policies', description: 'Configure leave types and accrual' },
    { key: 'manage_event_types', displayName: 'Manage Event Types', description: 'Configure event types' },
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
