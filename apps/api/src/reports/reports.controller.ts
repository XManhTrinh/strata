import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ReportsService, CreateReportDto } from './reports.service';
import { ReportType, ReportStatus } from './reports.repository';

const VALID_REPORT_TYPES: ReportType[] = ['headcount', 'capacity', 'budget', 'leave'];

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── Request a New Report ─────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async requestReport(@Body() body: CreateReportDto, @Req() req: Request) {
    const userId = (req as any).user?.sub || 'system';

    if (!body.type || !VALID_REPORT_TYPES.includes(body.type)) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [
          {
            field: 'type',
            message: `Report type must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
          },
        ],
      });
    }

    return this.reportsService.requestReport(body, userId);
  }

  // ─── List Reports ─────────────────────────────────────────────────────────

  @Get()
  async findReports(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Req() req?: Request,
  ) {
    const filters: { status?: ReportStatus; type?: ReportType; requestedBy?: string } = {};

    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      filters.status = status as ReportStatus;
    }
    if (type && VALID_REPORT_TYPES.includes(type as ReportType)) {
      filters.type = type as ReportType;
    }

    return this.reportsService.findMany(filters);
  }

  // ─── Get Report Details ───────────────────────────────────────────────────

  @Get(':id')
  async findReportById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  // ─── Download Report ──────────────────────────────────────────────────────

  @Get(':id/download')
  async downloadReport(@Param('id') id: string) {
    return this.reportsService.downloadReport(id);
  }
}
