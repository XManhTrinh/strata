import {
  Controller,
  Post,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get the current user's profile.
   * Also ensures a local Prisma User record exists (syncs on first call).
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: Request) {
    const user = (req as any).user;

    if (!user?.sub) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Ensure local user exists (creates Person + User on first sign-in)
    await this.authService.ensureLocalUser(user.sub, user.email);

    const profile = await this.authService.getProfile(user.sub);

    return profile || {
      id: user.sub,
      email: user.email,
      name: user.email,
      supabaseUserId: user.sub,
    };
  }

  /**
   * Sign out — revokes the current Supabase session server-side.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const token = this.extractToken(req);
    if (token) {
      try {
        await this.authService.logout(token);
      } catch {
        // Ignore errors — the session may already be expired
      }
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Health check for the auth service (public).
   */
  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return { status: 'ok' };
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
