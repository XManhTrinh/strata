import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { PeopleModule } from './people/people.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { CalendarModule } from './calendar/calendar.module';
import { OrgChartModule } from './org-chart/org-chart.module';

@Module({
  imports: [
    AuthModule,
    AuthorizationModule,
    PeopleModule,
    AuditModule,
    ReportsModule,
    CalendarModule,
    OrgChartModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
