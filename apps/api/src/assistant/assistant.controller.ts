import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@strata/database';
import { AssistantService } from './assistant.service';
import type { AssistantContext } from './assistant.types';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

const ChatSchema = z.object({
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_MESSAGE_LENGTH),
      }),
    )
    .max(MAX_HISTORY)
    .optional()
    .default([]),
});

/** Simple in-memory sliding-window rate limiter keyed by user+company. */
class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly windowMs = 60_000) {}
  private limit(): number {
    const raw = Number(process.env.ASSISTANT_RATE_LIMIT_PER_MIN);
    return Number.isFinite(raw) && raw > 0 ? raw : 20;
  }
  check(key: string): boolean {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit()) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

@Controller('companies/:companyId/assistant')
export class AssistantController {
  private readonly logger = new Logger(AssistantController.name);
  private readonly rateLimiter = new RateLimiter();

  constructor(
    private readonly service: AssistantService,
    private readonly prisma: PrismaClient,
  ) {}

  @Post('chat')
  async chat(
    @Param('companyId') companyId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    // 0. Provider availability (fail closed when unconfigured).
    if (!this.service.isAvailable()) {
      throw new ServiceUnavailableException('The assistant is not available.');
    }

    // 1. Resolve the authenticated user (Supabase sub → Prisma user id).
    const supabaseUserId = (req as unknown as { user?: { sub?: string } }).user?.sub;
    if (!supabaseUserId) {
      throw new ForbiddenException('Not authenticated.');
    }
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true },
    });
    if (!user) {
      throw new ForbiddenException('User not found.');
    }

    // 2. Verify the user is a member of the requested company.
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this company.');
    }

    // 3. Rate limit per user+company.
    if (!this.rateLimiter.check(`${user.id}:${companyId}`)) {
      throw new HttpException(
        'Too many requests. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Validate input.
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const ctx: AssistantContext = {
      companyId,
      userId: user.id,
      supabaseUserId,
    };

    // 5. Run the assistant.
    try {
      const result = await this.service.chat(ctx, {
        message: parsed.data.message,
        history: parsed.data.history,
      });

      // Audit: who, where, when, which tools — no message content or secrets.
      this.logger.log(
        `assistant chat: user=${user.id} company=${companyId} tools=[${result.toolsUsed.join(',')}]`,
      );

      return result;
    } catch (err) {
      this.logger.warn(`assistant chat failed: ${(err as Error).message}`);
      // Provider/LLM failures → 502, without leaking details.
      throw new HttpException(
        'The assistant is temporarily unavailable. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
