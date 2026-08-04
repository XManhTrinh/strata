import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsDomain } from './organizations.domain';
import { OrganizationsRepository } from './organizations.repository';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsDomain, OrganizationsRepository],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
