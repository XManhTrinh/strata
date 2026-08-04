import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngineeringController } from './engineering.controller';
import { EngineeringService } from './engineering.service';
import { EngineeringDomain } from './engineering.domain';
import { EngineeringRepository } from './engineering.repository';

@Module({
  imports: [AuthModule],
  controllers: [EngineeringController],
  providers: [EngineeringService, EngineeringDomain, EngineeringRepository],
  exports: [EngineeringService],
})
export class EngineeringModule {}
