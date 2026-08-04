import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';

export interface CreateSSOConfigDto {
  organizationId: string;
  provider: 'AZURE_AD' | 'GOOGLE' | 'OKTA' | 'GENERIC_OIDC';
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  callbackUrl: string;
  enabled?: boolean;
  autoProvision?: boolean;
}

export interface UpdateSSOConfigDto {
  provider?: 'AZURE_AD' | 'GOOGLE' | 'OKTA' | 'GENERIC_OIDC';
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  callbackUrl?: string;
  enabled?: boolean;
  autoProvision?: boolean;
}

@Injectable()
export class SsoAdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async createOrUpdateConfig(dto: CreateSSOConfigDto) {
    // Validate the organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!org) {
      throw new NotFoundException(
        `Organization ${dto.organizationId} not found`,
      );
    }

    // Validate URL format
    this.validateUrl(dto.issuerUrl, 'issuerUrl');
    this.validateUrl(dto.callbackUrl, 'callbackUrl');

    const existing = await this.prisma.sSOConfig.findUnique({
      where: { organizationId: dto.organizationId },
    });

    if (existing) {
      return this.prisma.sSOConfig.update({
        where: { organizationId: dto.organizationId },
        data: {
          provider: dto.provider,
          clientId: dto.clientId,
          clientSecret: dto.clientSecret,
          issuerUrl: dto.issuerUrl,
          callbackUrl: dto.callbackUrl,
          enabled: dto.enabled ?? true,
          autoProvision: dto.autoProvision ?? true,
        },
      });
    }

    return this.prisma.sSOConfig.create({
      data: {
        organizationId: dto.organizationId,
        provider: dto.provider,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        issuerUrl: dto.issuerUrl,
        callbackUrl: dto.callbackUrl,
        enabled: dto.enabled ?? true,
        autoProvision: dto.autoProvision ?? true,
      },
    });
  }

  async getConfig(organizationId: string) {
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new NotFoundException(
        'SSO configuration not found for this organization',
      );
    }

    return config;
  }

  async deleteConfig(organizationId: string) {
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new NotFoundException(
        'SSO configuration not found for this organization',
      );
    }

    await this.prisma.sSOConfig.delete({
      where: { organizationId },
    });

    return { message: 'SSO configuration removed successfully' };
  }

  async testConfig(organizationId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new NotFoundException(
        'SSO configuration not found for this organization',
      );
    }

    try {
      const discoveryUrl = `${config.issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
      const response = await fetch(discoveryUrl);

      if (!response.ok) {
        return {
          success: false,
          message: `Discovery document fetch failed with status ${response.status}`,
        };
      }

      const doc = (await response.json()) as Record<string, unknown>;

      // Validate essential fields exist
      if (!doc.authorization_endpoint || !doc.token_endpoint) {
        return {
          success: false,
          message:
            'Discovery document missing required endpoints (authorization_endpoint, token_endpoint)',
        };
      }

      return {
        success: true,
        message: 'SSO configuration is valid. Discovery document fetched successfully.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to reach IdP: ${error.message || 'Unknown error'}`,
      };
    }
  }

  private validateUrl(url: string, fieldName: string): void {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }
  }
}
