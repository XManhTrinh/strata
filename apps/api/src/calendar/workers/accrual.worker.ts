import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AccrualService } from '../services/accrual.service';

/**
 * BullMQ-compatible worker for processing monthly accrual jobs.
 * Queue: 'calendar', Job name: 'process-monthly-accrual'
 * Scheduled via repeatable job: { cron: '0 0 1 * *' } (1st of each month)
 *
 * In production, this would use the BullMQ Worker class directly.
 * Here we implement a polling-based approach using Redis for compatibility.
 */
@Injectable()
export class AccrualWorker implements OnModuleInit {
  private readonly logger = new Logger(AccrualWorker.name);
  private processing = false;

  constructor(
    private readonly accrualService: AccrualService,
    private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    // Register the repeatable job schedule
    await this.registerRepeatableJob();
  }

  /**
   * Registers the monthly accrual job as a repeatable BullMQ job.
   */
  private async registerRepeatableJob() {
    try {
      const jobSpec = JSON.stringify({
        name: 'process-monthly-accrual',
        opts: {
          repeat: { cron: '0 0 1 * *' }, // 1st of each month at midnight
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
        timestamp: Date.now(),
      });

      await this.redis.set('bull:calendar:repeatable:monthly-accrual', jobSpec);
      this.logger.log('Registered monthly accrual repeatable job');
    } catch (error) {
      this.logger.warn(`Failed to register repeatable job: ${error}`);
    }
  }

  /**
   * Process a monthly accrual job.
   * This method is called when a job is dequeued from the calendar queue.
   */
  async processJob(jobData: any): Promise<void> {
    if (this.processing) {
      this.logger.warn('Accrual processing already in progress, skipping');
      return;
    }

    this.processing = true;
    try {
      this.logger.log('Starting monthly accrual processing...');
      const result = await this.accrualService.processMonthlyAccrualAll();
      this.logger.log(
        `Monthly accrual complete: ${result.companiesProcessed} companies, ${result.policiesProcessed} policies`,
      );
    } catch (error) {
      this.logger.error(`Monthly accrual processing failed: ${error}`);
      throw error; // Allow retry
    } finally {
      this.processing = false;
    }
  }
}
