import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { SsoAdminService, CreateSSOConfigDto } from './sso-admin.service';

@Controller('auth/sso-admin')
export class SsoAdminController {
  constructor(private readonly ssoAdminService: SsoAdminService) {}

  /**
   * Create or update SSO configuration for an organization.
   * Admin only — protected by global AuthGuard (JWT required).
   */
  @Post('config')
  async createOrUpdateConfig(@Body() body: unknown) {
    const dto = this.validateCreateDto(body);
    return this.ssoAdminService.createOrUpdateConfig(dto);
  }

  /**
   * Get full SSO configuration for an organization (admin view with secrets).
   */
  @Get('config/:organizationId')
  async getConfig(@Param('organizationId') organizationId: string) {
    return this.ssoAdminService.getConfig(organizationId);
  }

  /**
   * Remove SSO configuration for an organization.
   */
  @Delete('config/:organizationId')
  async deleteConfig(@Param('organizationId') organizationId: string) {
    return this.ssoAdminService.deleteConfig(organizationId);
  }

  /**
   * Test SSO configuration by attempting to fetch the discovery document.
   */
  @Post('test/:organizationId')
  async testConfig(@Param('organizationId') organizationId: string) {
    return this.ssoAdminService.testConfig(organizationId);
  }

  private validateCreateDto(body: unknown): CreateSSOConfigDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    const data = body as Record<string, unknown>;

    const requiredFields = [
      'organizationId',
      'provider',
      'clientId',
      'clientSecret',
      'issuerUrl',
      'callbackUrl',
    ];

    for (const field of requiredFields) {
      if (!data[field] || typeof data[field] !== 'string') {
        throw new BadRequestException(`${field} is required and must be a string`);
      }
    }

    const validProviders = ['AZURE_AD', 'GOOGLE', 'OKTA', 'GENERIC_OIDC'];
    if (!validProviders.includes(data.provider as string)) {
      throw new BadRequestException(
        `provider must be one of: ${validProviders.join(', ')}`,
      );
    }

    return {
      organizationId: data.organizationId as string,
      provider: data.provider as CreateSSOConfigDto['provider'],
      clientId: data.clientId as string,
      clientSecret: data.clientSecret as string,
      issuerUrl: data.issuerUrl as string,
      callbackUrl: data.callbackUrl as string,
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : undefined,
      autoProvision:
        data.autoProvision !== undefined
          ? Boolean(data.autoProvision)
          : undefined,
    };
  }
}
