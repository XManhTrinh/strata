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
import { NotificationsService } from './notifications.service';

@Controller('companies/:companyId/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
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
    const userId = req?.user?.id;
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
    const userId = req?.user?.id;
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
    const userId = req?.user?.id;
    if (!userId) return { updated: 0 };

    return this.service.markAllAsRead(companyId, userId);
  }
}
