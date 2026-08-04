import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesDomain } from './employees.domain';
import { EmployeesRepository } from './employees.repository';

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesDomain, EmployeesRepository],
  exports: [EmployeesService],
})
export class EmployeesModule {}
