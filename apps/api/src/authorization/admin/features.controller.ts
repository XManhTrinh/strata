import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../authorization.guard';
import { RequireFeaturePermission } from '../authorization.decorator';
import { FeaturesService } from './features.service';
import { z } from 'zod';

@Controller()
@UseGuards(AuthorizationGuard)
export class FeaturesController {
  constructor(private readonly service: FeaturesService) {}

  /**
   * List all registered features (platform-wide, no company context needed).
   */
  @Get('features')
  async findAll() {
    return this.service.findAll();
  }

  /**
   * Get a feature by key with its permissions.
   */
  @Get('features/:key')
  async findByKey(@Param('key') key: string) {
    return this.service.findByKey(key);
  }

  /**
   * List features for a company with enabled status.
   * Accessible to any authenticated user — they can see which features
   * are available. Only super admins can toggle them (via PATCH).
   */
  @Get('companies/:companyId/features')
  async findForCompany(@Param('companyId') companyId: string) {
    return this.service.findForCompany(companyId);
  }

  /**
   * Enable or disable a feature for a company.
   */
  @Patch('companies/:companyId/features/:featureId')
  @RequireFeaturePermission('authorization', 'manage_features')
  async toggleFeature(
    @Param('companyId') companyId: string,
    @Param('featureId') featureId: string,
    @Body() body: unknown,
  ) {
    const schema = z.object({ enabled: z.boolean() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.toggleFeature(companyId, featureId, parsed.data.enabled);
  }
}
