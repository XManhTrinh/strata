import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PeopleModule } from './people/people.module';
import { EmployeesModule } from './employees/employees.module';
import { AuditModule } from './audit/audit.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { EngineeringModule } from './engineering/engineering.module';
import { CapacityModule } from './capacity/capacity.module';
import { BudgetingModule } from './budgeting/budgeting.module';
import { LeaveModule } from './leave/leave.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { CalendarModule } from './calendar/calendar.module';
import { OrgChartModule } from './org-chart/org-chart.module';

@Module({
  imports: [AuthModule, AuthorizationModule, PermissionsModule, PeopleModule, EmployeesModule, AuditModule, OrganizationsModule, EngineeringModule, CapacityModule, BudgetingModule, LeaveModule, NotificationsModule, ReportsModule, SearchModule, CalendarModule, OrgChartModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
