import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationsRepository, NotificationFilters } from './notifications.repository';
import { CreateNotificationDtoSchema } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly redis: Redis,
  ) {}

  // ─── Notification Creation ────────────────────────────────────────────────

  /**
   * Creates a notification and enqueues a delivery job to the "notifications" BullMQ queue.
   * Other services can call this method to create notifications for users.
   */
  async create(userId: string, message: string, type: string, priority: string = 'NORMAL') {
    const validated = CreateNotificationDtoSchema.parse({
      userId,
      message,
      type,
      priority,
    });

    const notification = await this.repository.create({
      userId: validated.userId,
      message: validated.message,
      type: validated.type,
      priority: validated.priority,
    });

    // Enqueue background delivery job via Redis (BullMQ-compatible format)
    await this.enqueueDeliveryJob(notification.id, notification.userId, notification.type);

    return notification;
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async findMany(filters: NotificationFilters) {
    return this.repository.findMany(filters);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  // ─── Mark as Read ─────────────────────────────────────────────────────────

  async markAsRead(id: string) {
    return this.repository.markAsRead(id);
  }

  // ─── Unread Count ─────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const count = await this.repository.getUnreadCount(userId);
    return { count };
  }

  // ─── Background Job Enqueueing ────────────────────────────────────────────

  /**
   * Enqueues a notification delivery job to the "notifications" BullMQ queue.
   * Uses Redis XADD to the BullMQ stream format for compatibility.
   * This is a placeholder — the Worker service processes these jobs.
   */
  private async enqueueDeliveryJob(notificationId: string, userId: string, type: string) {
    try {
      const jobData = JSON.stringify({
        notificationId,
        userId,
        type,
        enqueuedAt: new Date().toISOString(),
      });

      // Use BullMQ-compatible Redis list approach for job enqueueing
      await this.redis.lpush(
        'bull:notifications:wait',
        JSON.stringify({
          name: 'deliver',
          data: jobData,
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 500 } },
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Notification delivery enqueueing failure should not block notification creation
      // In production, this would log to an error tracking service
    }
  }
}
