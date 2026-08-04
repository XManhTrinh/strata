import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../authorization.guard';
import { RequireFeaturePermission } from '../authorization.decorator';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitSchema } from './dto/create-org-unit.dto';
import { UpdateOrgUnitSchema } from './dto/update-org-unit.dto';
import { MoveOrgUnitSchema } from './dto/move-org-unit.dto';
import { z } from 'zod';

@Controller('api/v2/companies/:companyId/org-units')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_org_structure')
export class OrgUnitsController {
  constructor(private readonly service: OrgUnitsService) {}

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateOrgUnitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.service.findAll(companyId, parentId);
  }

  @Get('tree')
  async getTree(@Param('companyId') companyId: string) {
    return this.service.getTree(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateOrgUnitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(companyId, id, parsed.data);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  async move(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = MoveOrgUnitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.move(companyId, id, parsed.data);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.archive(companyId, id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  async assignMembers(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const schema = z.object({ userIds: z.array(z.string().min(1)).min(1) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.assignMembers(companyId, id, parsed.data.userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeMember(companyId, id, userId);
  }
}
