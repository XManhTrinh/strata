import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetingController } from './budgeting.controller';
import { BudgetingService } from './budgeting.service';
import { BudgetingDomain } from './budgeting.domain';
import { BudgetingRepository } from './budgeting.repository';

@Module({
  imports: [AuthModule],
  controllers: [BudgetingController],
  providers: [BudgetingService, BudgetingDomain, BudgetingRepository],
  exports: [BudgetingService],
})
export class BudgetingModule {}
