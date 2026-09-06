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
import { CareerLevelsService } from './career-levels.service';
import { CreateCareerLevelSchema } from './dto/create-career-level.dto';
import { UpdateCareerLevelSchema } from './dto/update-career-level.dto';

@Controller('companies/:companyId/career-levels')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_org_structure')
export class CareerLevelsController {
  constructor(private readonly service: CareerLevelsService) {}

  @Get()
  async getScheme(@Param('companyId') companyId: string) {
    return this.service.getScheme(companyId);
  }

  @Post()
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateCareerLevelSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Patch(':id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateCareerLevelSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(companyId, id, parsed.data);
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
