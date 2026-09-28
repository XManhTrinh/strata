import { Injectable, Logger } from '@nestjs/common';
import type {
  LlmProvider,
  LlmGenerateInput,
  LlmGenerateResult,
  LlmMessage,
  LlmToolCall,
} from '../assistant.types';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_TIMEOUT_MS = 30_000;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

    const url = `${GEMINI_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

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
        `Gemini request failed${aborted ? ' (timeout)' : ''} — ${e?.name}: ${e?.message}${cause ? ` | cause: ${cause}` : ''}`,
      );
      throw new Error(aborted ? 'LLM request timed out' : 'LLM request failed');
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
      this.logger.warn(`Gemini returned HTTP ${res.status}${detail}`);
      throw new Error('LLM request failed');
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
