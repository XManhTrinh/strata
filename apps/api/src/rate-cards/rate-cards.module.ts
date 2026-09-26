import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateCardsController } from './rate-cards.controller';
import { RateCardsService } from './rate-cards.service';

@Module({
  imports: [AuthModule],
  controllers: [RateCardsController],
  providers: [RateCardsService],
  exports: [RateCardsService],
})
export class RateCardsModule {}
