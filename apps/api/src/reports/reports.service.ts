import { Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { ReportsRepository, ReportType, ReportStatus, ReportRecord } from './reports.repository';

export interface CreateReportDto {
  type: ReportType;
  filters?: Record<string, unknown>;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly redis: Redis,
  ) {}

  // ─── Request a New Report ─────────────────────────────────────────────────

  async requestReport(dto: CreateReportDto, userId: string): Promise<ReportRecord> {
    const reportId = uuidv4();

    const report: ReportRecord = {
      id: reportId,
      type: dto.type,
      status: 'pending',
      requestedBy: userId,
      requestedAt: new Date(),
      filters: dto.filters,
    };

    this.repository.create(report);

    // Enqueue generation job to the "reports" BullMQ queue
    await this.enqueueReportJob(report);

    return report;
  }

  // ─── List Reports ─────────────────────────────────────────────────────────

  async findMany(filters?: { status?: ReportStatus; type?: ReportType; requestedBy?: string }): Promise<ReportRecord[]> {
    return this.repository.findMany(filters);
  }

  // ─── Get Report Details ───────────────────────────────────────────────────

  async findById(id: string): Promise<ReportRecord> {
    const report = this.repository.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with id "${id}" not found`);
    }
    return report;
  }

  // ─── Download Report ──────────────────────────────────────────────────────

  async downloadReport(id: string): Promise<{ report: ReportRecord; data: unknown }> {
    const report = this.repository.findById(id);
    if (!report) {
      throw new NotFoundException(`Report with id "${id}" not found`);
    }

    return {
      report: {
        id: report.id,
        type: report.type,
        status: report.status,
        requestedBy: report.requestedBy,
        requestedAt: report.requestedAt,
        completedAt: report.completedAt,
        filters: report.filters,
      },
      data: report.data || null,
    };
  }

  // ─── Update Report Status (called by worker via callback or polling) ──────

  updateStatus(id: string, status: ReportStatus, data?: unknown, error?: string): ReportRecord | undefined {
    return this.repository.updateStatus(id, status, data, error);
  }

  // ─── Background Job Enqueueing ────────────────────────────────────────────

  private async enqueueReportJob(report: ReportRecord): Promise<void> {
    try {
      const jobData = JSON.stringify({
        reportId: report.id,
        type: report.type,
        requestedBy: report.requestedBy,
        filters: report.filters,
        enqueuedAt: new Date().toISOString(),
      });

      // Use BullMQ-compatible Redis list approach for job enqueueing
      await this.redis.lpush(
        'bull:reports:wait',
        JSON.stringify({
          name: 'generate',
          data: jobData,
          opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Job enqueueing failure should not block report creation
      // In production, this would log to an error tracking service
    }
  }
}
