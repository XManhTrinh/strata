import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { z } from 'zod';

const CreateViewSchema = z.object({
  name: z.string().min(1),
  table: z.string().min(1).default('members'),
  columns: z.array(z.string()).min(1),
  isDefault: z.boolean().optional(),
});

const UpdateViewSchema = z.object({
  name: z.string().min(1).optional(),
  columns: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

@Controller('companies/:companyId/table-views')
export class TableViewsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
  ) {
    return this.prisma.tableView.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  @Get(':table')
  async findByTable(
    @Param('companyId') companyId: string,
    @Param('table') table: string,
  ) {
    return this.prisma.tableView.findMany({
      where: { companyId, table },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    // If setting as default, unset other defaults for this table
    if (parsed.data.isDefault) {
      await this.prisma.tableView.updateMany({
        where: { companyId, table: parsed.data.table, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tableView.create({
      data: {
        companyId,
        name: parsed.data.name,
        table: parsed.data.table,
        columns: parsed.data.columns,
        isDefault: parsed.data.isDefault ?? false,
      },
    });
  }

  @Put(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateViewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const view = await this.prisma.tableView.findFirst({
      where: { id, companyId },
    });
    if (!view) throw new NotFoundException('Table view not found');

    if (parsed.data.isDefault) {
      await this.prisma.tableView.updateMany({
        where: { companyId, table: view.table, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.tableView.update({
      where: { id },
      data: parsed.data,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const view = await this.prisma.tableView.findFirst({
      where: { id, companyId },
    });
    if (!view) throw new NotFoundException('Table view not found');

    await this.prisma.tableView.delete({ where: { id } });
    return { deleted: true };
  }
}
