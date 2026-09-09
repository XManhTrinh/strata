import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { NotificationsService } from './notifications.service';

@Controller('companies/:companyId/notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly prisma: PrismaClient,
  ) {}

  /** Resolve internal user ID from Supabase auth user (req.user.sub). */
  private async resolveUserId(req: any): Promise<string | null> {
    const supabaseUserId = req?.user?.sub;
    if (!supabaseUserId) return null;
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Req() req?: any,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return [];

    return this.service.findAll(companyId, userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(
    @Param('companyId') companyId: string,
    @Req() req?: any,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return { count: 0 };

    const count = await this.service.getUnreadCount(companyId, userId);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req?: any,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return { success: false };

    await this.service.markAsRead(companyId, userId, id);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Param('companyId') companyId: string,
    @Req() req?: any,
  ) {
    const userId = await this.resolveUserId(req);
    if (!userId) return { updated: 0 };

    return this.service.markAllAsRead(companyId, userId);
  }
}
