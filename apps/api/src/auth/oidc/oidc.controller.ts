import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { OidcService } from './oidc.service';
import { Public } from '../public.decorator';

@Controller('auth/sso')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  /**
   * Initiates the OIDC login flow by redirecting the user to the IdP.
   */
  @Public()
  @Get(':organizationId/login')
  async login(
    @Param('organizationId') organizationId: string,
    @Query('returnUrl') returnUrl: string = '/',
    @Res() res: Response,
  ) {
    const authorizationUrl = await this.oidcService.initiateLogin(
      organizationId,
      returnUrl,
    );
    res.redirect(authorizationUrl);
  }

  /**
   * OIDC callback handler — exchanges authorization code for tokens,
   * creates/matches user, and issues a Strata JWT.
   */
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      const frontendUrl =
        process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/login?error=missing_params`,
      );
      return;
    }

    try {
      const result = await this.oidcService.handleCallback(code, state);

      // Redirect back to frontend with tokens as query params
      // In production, these would be set as secure httpOnly cookies
      const frontendUrl =
        process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        returnUrl: result.returnUrl,
      });

      res.redirect(`${frontendUrl}/sso/callback?${params.toString()}`);
    } catch (error: any) {
      const frontendUrl =
        process.env.FRONTEND_URL || 'http://localhost:3000';
      const message =
        error?.message || 'SSO authentication failed';
      res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(message)}`,
      );
    }
  }

  /**
   * Returns SSO configuration status for an organization (public info, no secrets).
   */
  @Public()
  @Get(':organizationId/config')
  async getConfig(@Param('organizationId') organizationId: string) {
    const status = await this.oidcService.getConfigStatus(organizationId);
    if (!status) {
      throw new NotFoundException(
        'SSO is not configured for this organization',
      );
    }
    return status;
  }
}
