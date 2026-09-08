import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { z } from 'zod';

const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  settings: z.record(z.unknown()).optional(),
});

@Controller('companies/:companyId/settings')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Get()
  async getCompany(@Param('companyId') companyId: string) {
    return this.service.getCompany(companyId);
  }

  @Patch()
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateCompanySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.updateCompany(companyId, parsed.data);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetAllData(@Param('companyId') companyId: string) {
    return this.service.resetAllData(companyId);
  }
}
