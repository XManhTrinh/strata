import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, NotificationType } from '@strata/database';
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
 * Handles job types:
 * - leave-submitted: Notify manager(s) that a new leave request needs review
 * - leave-approved: Notify employee that their leave was approved
 * - leave-rejected: Notify employee that their leave was rejected
 * - leave-cancelled: Notify relevant parties of cancellation
 *
 * Retry config: 3 attempts, exponential backoff.
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
        await this.handleLeaveSubmitted(job.data);
        break;
      case 'leave-approved':
        await this.handleLeaveApproved(job.data);
        break;
      case 'leave-rejected':
        await this.handleLeaveRejected(job.data);
        break;
      case 'leave-cancelled':
        await this.handleLeaveCancelled(job.data);
        break;
      default:
        this.logger.warn(`Unknown notification type: ${job.type}`);
    }
  }

  private async handleLeaveSubmitted(data: LeaveNotificationJob['data']) {
    // Notify managers who can approve this request
    try {
      await this.createNotification(
        data.userId, // For now, notify the submitter of receipt
        `Your leave request has been submitted and is pending approval.`,
        'leave-submitted',
      );
    } catch (error) {
      this.logger.error(`Failed to handle leave-submitted notification: ${error}`);
      throw error;
    }
  }

  private async handleLeaveApproved(data: LeaveNotificationJob['data']) {
    try {
      await this.createNotification(
        data.userId,
        `Your leave request has been approved.`,
        'leave-approved',
      );
    } catch (error) {
      this.logger.error(`Failed to handle leave-approved notification: ${error}`);
      throw error;
    }
  }

  private async handleLeaveRejected(data: LeaveNotificationJob['data']) {
    try {
      await this.createNotification(
        data.userId,
        `Your leave request has been rejected.`,
        'leave-rejected',
      );
    } catch (error) {
      this.logger.error(`Failed to handle leave-rejected notification: ${error}`);
      throw error;
    }
  }

  private async handleLeaveCancelled(data: LeaveNotificationJob['data']) {
    try {
      await this.createNotification(
        data.userId,
        `A leave request has been cancelled.`,
        'leave-cancelled',
      );
    } catch (error) {
      this.logger.error(`Failed to handle leave-cancelled notification: ${error}`);
      throw error;
    }
  }

  /**
   * Creates a notification record in the database.
   */
  private async createNotification(userId: string, message: string, type: string) {
    try {
      const notificationType = this.mapNotificationType(type);
      await this.prisma.notification.create({
        data: {
          userId,
          message,
          type: notificationType,
          priority: 'NORMAL',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error}`);
      throw error;
    }
  }

  private mapNotificationType(type: string): NotificationType {
    switch (type) {
      case 'leave-submitted':
        return NotificationType.LEAVE_REQUEST;
      case 'leave-approved':
        return NotificationType.LEAVE_APPROVED;
      case 'leave-rejected':
        return NotificationType.LEAVE_REJECTED;
      default:
        return NotificationType.SYSTEM_ALERT;
    }
  }
}
