import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.employeesService.create(body, userId);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
    @Query('status') status?: string,
    @Query('startDateGte') startDateGte?: string,
    @Query('endDateLte') endDateLte?: string,
  ) {
    return this.employeesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      departmentId,
      positionId,
      status,
      startDateGte,
      endDateLte,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.employeesService.update(id, body, userId);
  }

  @Patch(':id/status')
  async transitionStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.employeesService.transitionStatus(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.employeesService.delete(id, userId);
  }
}
