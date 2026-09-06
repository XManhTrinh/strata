import {
  Controller,
  Post,
  Get,
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
import { ReportingService } from './reporting.service';
import { SetManagerSchema } from './dto/set-manager.dto';

@Controller('companies/:companyId/reporting')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_org_structure')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Post()
  async setManager(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = SetManagerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.setManager(companyId, parsed.data);
  }

  @Get(':userId')
  async getManager(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getManager(companyId, userId);
  }

  @Get(':userId/direct-reports')
  async getDirectReports(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getDirectReports(companyId, userId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async removeManager(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeManager(companyId, userId);
  }
}
