import { Injectable } from '@nestjs/common';

export type ReportType = 'headcount' | 'capacity' | 'budget' | 'leave';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportRecord {
  id: string;
  type: ReportType;
  status: ReportStatus;
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  filters?: Record<string, unknown>;
  data?: unknown;
  error?: string;
}

/**
 * In-memory repository for report records.
 * Acts as a placeholder until a dedicated Reports table is added to the Prisma schema.
 */
@Injectable()
export class ReportsRepository {
  private reports: Map<string, ReportRecord> = new Map();

  create(report: ReportRecord): ReportRecord {
    this.reports.set(report.id, report);
    return report;
  }

  findById(id: string): ReportRecord | undefined {
    return this.reports.get(id);
  }

  findMany(filters?: { status?: ReportStatus; type?: ReportType; requestedBy?: string }): ReportRecord[] {
    let results = Array.from(this.reports.values());

    if (filters?.status) {
      results = results.filter((r) => r.status === filters.status);
    }
    if (filters?.type) {
      results = results.filter((r) => r.type === filters.type);
    }
    if (filters?.requestedBy) {
      results = results.filter((r) => r.requestedBy === filters.requestedBy);
    }

    // Sort by requestedAt descending (newest first)
    results.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    return results;
  }

  updateStatus(id: string, status: ReportStatus, data?: unknown, error?: string): ReportRecord | undefined {
    const report = this.reports.get(id);
    if (!report) return undefined;

    report.status = status;
    if (status === 'completed') {
      report.completedAt = new Date();
      report.data = data;
    }
    if (error) {
      report.error = error;
    }

    this.reports.set(id, report);
    return report;
  }
}
