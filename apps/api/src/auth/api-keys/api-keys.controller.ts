import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';

@Controller('auth/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * Generate a new API key. Returns the full key once.
   */
  @Post()
  async generateKey(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (!userId) {
      throw new BadRequestException('User context not available');
    }

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    const data = body as Record<string, unknown>;

    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestException('name is required and must be a string');
    }

    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt as string)
      : undefined;

    if (expiresAt && isNaN(expiresAt.getTime())) {
      throw new BadRequestException('expiresAt must be a valid date');
    }

    return this.apiKeysService.generateKey(userId, data.name, expiresAt);
  }

  /**
   * List user's API keys (name, prefix, created, last used — not the full key).
   */
  @Get()
  async listKeys(@Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (!userId) {
      throw new BadRequestException('User context not available');
    }

    return this.apiKeysService.listKeys(userId);
  }

  /**
   * Revoke an API key.
   */
  @Delete(':id')
  async revokeKey(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (!userId) {
      throw new BadRequestException('User context not available');
    }

    return this.apiKeysService.revokeKey(id, userId);
  }
}
