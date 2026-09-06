import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import Redis from 'ioredis';

interface LeaveNotificationJob {
  type: 'leave-submitted' | 'leave-approved' | 'leave-rejected' | 'leave-cancelled';
  data: {
    requestId: string;
    userId: string;
    companyId: string;
    reviewerId?: string;
    cancelledBy?: string;
  };
  enqueuedAt: string;
}

/**
 * BullMQ-compatible worker for dispatching leave notification jobs.
 * Queue: 'calendar', Job name: 'notification'
 *
 * Currently logs notifications. Can be extended to send emails,
 * push notifications, or write to a notification table later.
 */
@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Process a notification job from the queue.
   */
  async processJob(rawData: string): Promise<void> {
    let job: LeaveNotificationJob;
    try {
      job = JSON.parse(rawData);
    } catch {
      this.logger.error('Failed to parse notification job data');
      return;
    }

    switch (job.type) {
      case 'leave-submitted':
        this.logger.log(`Leave submitted notification for user ${job.data.userId}`);
        break;
      case 'leave-approved':
        this.logger.log(`Leave approved notification for user ${job.data.userId}`);
        break;
      case 'leave-rejected':
        this.logger.log(`Leave rejected notification for user ${job.data.userId}`);
        break;
      case 'leave-cancelled':
        this.logger.log(`Leave cancelled notification for user ${job.data.userId}`);
        break;
      default:
        this.logger.warn(`Unknown notification type: ${job.type}`);
    }
  }
}
