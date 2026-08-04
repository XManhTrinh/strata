import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';
import { PeopleDomain } from './people.domain';
import { PeopleRepository } from './people.repository';

@Module({
  imports: [AuthModule],
  controllers: [PeopleController],
  providers: [PeopleService, PeopleDomain, PeopleRepository],
  exports: [PeopleService],
})
export class PeopleModule {}
