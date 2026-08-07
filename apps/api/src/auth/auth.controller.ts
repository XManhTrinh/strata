import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CookieService } from './cookie/cookie.service';
import { LoginSchema } from './dto/login.dto';
import { Public } from './public.decorator';
import { AuthGuard } from './auth.guard';
import { PrismaClient } from '@strata/database';
import { signAccessToken } from '@strata/auth';
import { randomUUID } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly prisma: PrismaClient,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const tokens = await this.authService.login(result.data.email, result.data.password);

    // Set cookies instead of returning tokens in body
    this.cookieService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    this.cookieService.setCsrfCookie(res, this.cookieService.generateCsrfToken());

    return { success: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.cookieService.getRefreshToken(req);

    if (!refreshToken) {
      this.cookieService.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      const tokens = await this.authService.refresh(refreshToken);
      this.cookieService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      this.cookieService.setCsrfCookie(res, this.cookieService.generateCsrfToken());
      return { success: true };
    } catch (error) {
      this.cookieService.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.cookieService.getRefreshToken(req);

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.cookieService.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: Request) {
    const user = (req as any).user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('Not authenticated');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { person: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.person?.fullName || dbUser.email,
      roles: [],
    };
  }

  @Public()
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Res({ passthrough: true }) res: Response) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    // Issue tokens for dev user usr_001 (Sarah Chen)
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const accessToken = signAccessToken(
      { sub: 'usr_001', email: 'alice.johnson@acme.test' },
      jwtSecret,
    );

    const refreshTokenValue = randomUUID();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: 'usr_001',
        expiresAt: refreshExpiresAt,
      },
    });

    this.cookieService.setAuthCookies(res, accessToken, refreshTokenValue);
    this.cookieService.setCsrfCookie(res, this.cookieService.generateCsrfToken());

    return { success: true };
  }
}
