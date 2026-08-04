import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ─── Department Endpoints ──────────────────────────────────────────────────

  @Post('departments')
  async createDepartment(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.createDepartment(body, userId);
  }

  @Get('departments')
  async findAllDepartments(
    @Query('organizationId') organizationId: string,
    @Query('tree') tree?: string,
  ) {
    return this.organizationsService.findAllDepartments(
      organizationId,
      tree === 'true',
    );
  }

  @Get('departments/:id')
  async findDepartmentById(@Param('id') id: string) {
    return this.organizationsService.findDepartmentById(id);
  }

  @Put('departments/:id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.updateDepartment(id, body, userId);
  }

  @Delete('departments/:id')
  @HttpCode(HttpStatus.OK)
  async deleteDepartment(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.deleteDepartment(id, userId);
  }

  // ─── Position Endpoints ────────────────────────────────────────────────────

  @Post('positions')
  async createPosition(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.createPosition(body, userId);
  }

  @Get('positions')
  async findAllPositions(@Query('departmentId') departmentId?: string) {
    return this.organizationsService.findAllPositions(departmentId);
  }

  @Get('positions/:id')
  async findPositionById(@Param('id') id: string) {
    return this.organizationsService.findPositionById(id);
  }

  @Put('positions/:id')
  async updatePosition(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.updatePosition(id, body, userId);
  }

  @Delete('positions/:id')
  @HttpCode(HttpStatus.OK)
  async deletePosition(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.organizationsService.deletePosition(id, userId);
  }
}
