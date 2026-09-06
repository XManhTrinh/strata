import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompanyPeopleController } from './company-people.controller';
import { CompanyPeopleService } from './company-people.service';
import { TableViewsController } from './table-views.controller';

@Module({
  imports: [AuthModule],
  controllers: [CompanyPeopleController, TableViewsController],
  providers: [CompanyPeopleService],
  exports: [CompanyPeopleService],
})
export class PeopleModule {}
