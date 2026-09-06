import {
  Controller,
  Post,
  Get,
  Patch,
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
import { OrgUnitTypesService } from './org-unit-types.service';
import { CreateOrgUnitTypeSchema } from './dto/create-org-unit-type.dto';
import { UpdateOrgUnitTypeSchema } from './dto/update-org-unit-type.dto';

@Controller('companies/:companyId/org-unit-types')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_org_structure')
export class OrgUnitTypesController {
  constructor(private readonly service: OrgUnitTypesService) {}

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateOrgUnitTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string,
    @Query('archived') archived?: string,
  ) {
    const archivedFilter =
      archived === 'true' ? true : archived === 'false' ? false : undefined;
    return this.service.findAll(companyId, archivedFilter);
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
    const parsed = UpdateOrgUnitTypeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(companyId, id, parsed.data);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.archive(companyId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.restore(companyId, id);
  }
}
