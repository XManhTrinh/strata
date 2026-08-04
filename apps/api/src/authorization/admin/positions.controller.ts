import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../authorization.guard';
import { RequireFeaturePermission } from '../authorization.decorator';
import { PositionsService } from './positions.service';
import { CreatePositionSchema } from './dto/create-position.dto';
import { UpdatePositionSchema } from './dto/update-position.dto';

@Controller('api/v2/companies/:companyId/positions')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_org_structure')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreatePositionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Patch(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdatePositionSchema.safeParse(body);
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(companyId, id);
  }
}
