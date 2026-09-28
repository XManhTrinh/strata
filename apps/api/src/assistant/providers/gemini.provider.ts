import { Injectable, Logger } from '@nestjs/common';
import type {
  LlmProvider,
  LlmGenerateInput,
  LlmGenerateResult,
  LlmMessage,
  LlmToolCall,
} from '../assistant.types';

const DEFAULT_MODEL = 'gemini-3.8-flash';
// No default fallback: on this API the sibling flash models are unreliable
// (intermittent 404s). Retrying the primary handles transient 429/503. Set
// GEMINI_FALLBACK_MODEL explicitly to enable a fallback if one is dependable.
const DEFAULT_FALLBACK_MODEL = '';
const DEFAULT_TIMEOUT_MS = 30_000;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Statuses worth retrying: rate limit, overload/unavailable, and 404 — on this
// API the flash models intermittently 404 under load rather than returning 503.
const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);
const MAX_ATTEMPTS_PER_MODEL = 3;
const RETRY_BASE_DELAY_MS = 700;

/** A Gemini call failure that carries whether a retry is worthwhile. */
class GeminiCallError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'GeminiCallError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Shapes for the subset of the Gemini generateContent API we use. */
interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

/**
 * Google Gemini implementation of the LlmProvider abstraction.
 *
 * Reads GEMINI_API_KEY / GEMINI_MODEL from the environment; the key is never
 * logged or returned to callers. All Gemini-specific request/response shaping
 * lives here so the rest of the assistant is provider-agnostic.
 */
@Injectable()
export class GeminiProvider implements LlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }
  private get model(): string {
    return process.env.GEMINI_MODEL || DEFAULT_MODEL;
  }
  private get fallbackModel(): string | null {
    const fb = process.env.GEMINI_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
    // A fallback only helps if it differs from the primary model.
    return fb && fb !== this.model ? fb : null;
  }
  private get timeoutMs(): number {
    const raw = Number(process.env.ASSISTANT_REQUEST_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    if (!this.apiKey) {
      // Fail closed — the service maps this to an "unavailable" response.
      throw new Error('LLM provider is not configured');
    }

    // Try the primary model (with retries on transient errors), then the
    // fallback model. Gemini's shared models occasionally return 429/503 under
    // load; a couple of retries + a fallback keeps that invisible to the user.
    const models = [this.model, this.fallbackModel].filter(
      (m): m is string => !!m,
    );

    let lastError: Error = new Error('LLM request failed');
    for (const model of models) {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
        try {
          return await this.callModel(model, input);
        } catch (err) {
          lastError = err as Error;
          const retryable = err instanceof GeminiCallError && err.retryable;
          const moreAttempts = attempt < MAX_ATTEMPTS_PER_MODEL;
          if (retryable && moreAttempts) {
            await sleep(RETRY_BASE_DELAY_MS * attempt);
            continue;
          }
          // Non-retryable, or out of attempts for this model → move to fallback.
          break;
        }
      }
    }
    throw lastError;
  }

  /** A single generateContent call against one model. */
  private async callModel(
    model: string,
    input: LlmGenerateInput,
  ): Promise<LlmGenerateResult> {
    const body = {
      systemInstruction: { parts: [{ text: input.systemInstruction }] },
      contents: this.toContents(input.messages),
      tools: input.tools.length
        ? [
            {
              functionDeclarations: input.tools.map((t) => {
                const decl: Record<string, unknown> = {
                  name: t.name,
                  description: t.description,
                };
                // Gemini rejects function declarations with an empty parameters
                // object — only include `parameters` when there are properties.
                const props = (t.parameters as { properties?: Record<string, unknown> })
                  ?.properties;
                if (props && Object.keys(props).length > 0) {
                  decl.parameters = t.parameters;
                }
                return decl;
              }),
            },
          ]
        : undefined,
    };

    const url = `${GEMINI_BASE}/${model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      // Log the underlying cause (name/message/cause) without the URL (which
      // contains the key), to distinguish timeouts from network/proxy failures.
      const e = err as Error & { cause?: unknown };
      const cause =
        e?.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e?.cause ?? '');
      this.logger.warn(
        `Gemini request failed${aborted ? ' (timeout)' : ''} [${model}] — ${e?.name}: ${e?.message}${cause ? ` | cause: ${cause}` : ''}`,
      );
      // Network errors and timeouts are worth a retry.
      throw new GeminiCallError(
        aborted ? 'LLM request timed out' : 'LLM request failed',
        true,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // Include Gemini's error message (not the key/URL) to aid diagnosis.
      let detail = '';
      try {
        const errBody = (await res.json()) as { error?: { message?: string } };
        detail = errBody?.error?.message ? ` — ${errBody.error.message}` : '';
      } catch {
        // ignore parse failure
      }
      this.logger.warn(`Gemini returned HTTP ${res.status} [${model}]${detail}`);
      throw new GeminiCallError('LLM request failed', RETRYABLE_STATUS.has(res.status));
    }

    const data = (await res.json()) as GeminiResponse;
    return this.parse(data);
  }

  /** Map neutral messages to Gemini `contents`. Tool results become functionResponse parts. */
  private toContents(messages: LlmMessage[]): GeminiContent[] {
    return messages.map((m) => {
      if (m.role === 'tool') {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(m.content) as Record<string, unknown>;
        } catch {
          parsed = { result: m.content };
        }
        return {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: m.toolName ?? 'tool',
                response: parsed,
              },
            },
          ],
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      };
    });
  }

  private parse(data: GeminiResponse): LlmGenerateResult {
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const toolCalls: LlmToolCall[] = [];
    let text = '';
    for (const part of parts) {
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
        });
      } else if (part.text) {
        text += part.text;
      }
    }
    if (toolCalls.length > 0) return { toolCalls };
    return { text: text.trim() };
  }
}
