import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@strata/database';

export interface CreateNotificationDto {
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * List notifications for a user in a company, newest first.
   */
  async findAll(
    companyId: string,
    userId: string,
    options: { limit?: number; unreadOnly?: boolean } = {},
  ): Promise<NotificationResponse[]> {
    const limit = options.limit ?? 50;

    const notifications = await this.prisma.notification.findMany({
      where: {
        companyId,
        userId,
        ...(options.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      companyId: n.companyId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: (n.metadata as Record<string, unknown>) ?? {},
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(companyId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { companyId, userId, read: false },
    });
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(companyId: string, userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, companyId, userId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(companyId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { companyId, userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }

  /**
   * Create a notification. Used by other services (e.g. import).
   */
  async create(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        companyId: dto.companyId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: (dto.metadata ?? {}) as any,
      },
    });

    return {
      id: notification.id,
      companyId: notification.companyId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: (notification.metadata as Record<string, unknown>) ?? {},
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
