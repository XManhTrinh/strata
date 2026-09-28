import type { ZodType } from 'zod';

/** The authenticated caller on whose behalf the assistant acts. */
export interface AssistantContext {
  companyId: string;
  /** Prisma User.id (resolved from the Supabase subject). */
  userId: string;
  /** Supabase auth subject (req.user.sub). */
  supabaseUserId: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatInput {
  message: string;
  history: AssistantMessage[];
}

export interface ChatResult {
  reply: string;
  toolsUsed: string[];
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export type ToolMode = 'read' | 'write';

/** The feature+permission a tool requires, evaluated via the AuthorizationEngine. */
export interface ToolPermission {
  feature: string;
  permission: string;
}

/**
 * A named, typed capability the LLM may invoke. Each tool wraps an existing
 * read-only service method, runs under the caller's identity, and returns data
 * that has already had unauthorized fields redacted.
 */
export interface AssistantTool {
  name: string;
  /** Human/LLM-facing description of what the tool does. */
  description: string;
  /** Zod schema for the tool's arguments (also emitted as JSON schema for the LLM). */
  parameters: ZodType;
  /** Phase 1: always 'read'. Reserved so write tools can require confirmation later. */
  mode: ToolMode;
  /** Permission required to run the tool; null means always-deny (fail closed). */
  requiredPermission: ToolPermission | null;
  /** Execute against existing services; MUST return redaction-safe data. */
  run(ctx: AssistantContext, args: unknown): Promise<unknown>;
}

// ─── LLM provider abstraction ──────────────────────────────────────────────────

/** A single message in the provider conversation (may carry a tool result). */
export interface LlmMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /** Present when role === 'tool': which tool this result is for. */
  toolName?: string;
}

/** A function declaration presented to the LLM. */
export interface LlmToolDefinition {
  name: string;
  description: string;
  /** JSON Schema object describing the tool's parameters. */
  parameters: Record<string, unknown>;
}

/** A tool call the model wants executed. */
export interface LlmToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface LlmGenerateInput {
  systemInstruction: string;
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
}

/** Provider result: either a final text answer or a set of tool calls. */
export interface LlmGenerateResult {
  text?: string;
  toolCalls?: LlmToolCall[];
}

/** Provider abstraction — swap Gemini for another LLM by implementing this. */
export interface LlmProvider {
  /** True when the provider is configured (e.g. API key present). */
  isConfigured(): boolean;
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}

/** Injection token for the active LlmProvider. */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
