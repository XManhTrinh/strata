import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { AuthorizationGuard } from '../../authorization/authorization.guard';
import { RequireFeaturePermission } from '../../authorization/authorization.decorator';
import { BalanceService } from '../services/balance.service';
import { AdjustBalanceSchema } from '../dto/adjust-balance.dto';

@Controller('companies/:companyId/calendar/balances')
@UseGuards(AuthGuard, AuthorizationGuard)
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  @RequireFeaturePermission('calendar', 'read')
  async getOwnBalances(
    @Param('companyId') companyId: string,
    @Query('year') year: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const targetYear = year ? parseInt(year, 10) : undefined;
    return this.balanceService.getBalances(user.sub, companyId, targetYear);
  }

  @Get(':userId')
  @RequireFeaturePermission('calendar', 'read')
  async getUserBalances(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Query('year') year: string | undefined,
  ) {
    const targetYear = year ? parseInt(year, 10) : undefined;
    return this.balanceService.getBalances(userId, companyId, targetYear);
  }

  @Post(':userId/adjust')
  @RequireFeaturePermission('calendar', 'approve')
  async adjustBalance(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    const parsed = AdjustBalanceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.balanceService.adjustBalance(user.sub, companyId, targetUserId, parsed.data);
  }
}
