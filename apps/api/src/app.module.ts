import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { CompanyModule } from './company/company.module';
import { PeopleModule } from './people/people.module';
import { CapacityModule } from './capacity/capacity.module';
import { CalendarModule } from './calendar/calendar.module';
import { OrgChartModule } from './org-chart/org-chart.module';

@Module({
  imports: [
    AuthModule,
    AuthorizationModule,
    CompanyModule,
    PeopleModule,
    CapacityModule,
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
