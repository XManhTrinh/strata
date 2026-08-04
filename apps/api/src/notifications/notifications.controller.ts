import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── List Notifications ───────────────────────────────────────────────────

  @Get()
  async findNotifications(
    @Req() req: Request,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user?.sub;

    return this.notificationsService.findMany({
      userId,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type: type || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Unread Count ─────────────────────────────────────────────────────────

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.notificationsService.getUnreadCount(userId);
  }

  // ─── Get Notification By ID ───────────────────────────────────────────────

  @Get(':id')
  async findNotificationById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  // ─── Mark as Read ─────────────────────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
