import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  CompanyPeopleService,
  CreateMemberDto,
  UpdateMemberDto,
  ImportMemberDto,
} from './company-people.service';
import { z } from 'zod';

const CreateMemberSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  dateOfBirth: z.string().optional(),
  roleId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const UpdateMemberSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  dateOfBirth: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const ImportMemberSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  orgStructure: z.string().optional(),
  orgLevelTypes: z.array(z.string()).optional(),
  position: z.string().optional(),
  grade: z.string().optional(),
  lineManagerEmail: z.string().optional(),
  lineManagerIdentifier: z.string().optional(),
  lineManagerMatchField: z.string().optional(),
  employmentType: z.string().optional(),
  annualSalary: z.string().optional(),
  dayRate: z.string().optional(),
  roleId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const BulkImportSchema = z.object({
  rows: z.array(ImportMemberSchema).min(1, 'At least one row required'),
});

@Controller('companies/:companyId/members')
export class CompanyPeopleController {
  constructor(private readonly service: CompanyPeopleService) {}

  /**
   * Verify the requesting user has access to this company.
   * Called implicitly by AuthGuard (validates JWT) — but we also need to
   * ensure the user is a member of the requested company.
   */

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(companyId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search: search || undefined,
    });
  }

  @Get('metadata-keys')
  async getMetadataKeys(@Param('companyId') companyId: string) {
    return this.service.getMetadataKeys(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateMemberSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async bulkImport(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.bulkImport(companyId, parsed.data.rows);
  }

  @Put(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateMemberSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(companyId, id, parsed.data);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  async removeAll(@Param('companyId') companyId: string) {
    return this.service.removeAll(companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Post(':id/roles/:roleId')
  async assignRole(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return this.service.assignRole(companyId, id, roleId);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return this.service.removeRole(companyId, id, roleId);
  }
}
