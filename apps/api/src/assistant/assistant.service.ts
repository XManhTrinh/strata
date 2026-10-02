import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthorizationEngine } from '../authorization/authorization.engine';
import { ToolRegistry } from './tools/tool-registry';
import { authorizeTool } from './authz/authorize-tool';
import {
  LLM_PROVIDER,
  LlmError,
  type AssistantContext,
  type ChatInput,
  type ChatResult,
  type LlmMessage,
  type LlmProvider,
} from './assistant.types';

const DEFAULT_MAX_TOOL_CALLS = 6;

const SYSTEM_INSTRUCTION = [
  'You are Strata Assistant, a helpful read-only assistant embedded in the Strata workforce management app.',
  'Answer questions about the current company using ONLY data returned by the provided tools. Never invent numbers, names, salaries, or records.',
  'You can read data but you CANNOT make changes. If the user asks you to create, update, delete, or apply anything, explain that you are read-only and cannot make changes in this version.',
  'All data is scoped to the user\'s current company. Never reference other companies.',
  'If a tool reports that the user does not have permission, tell the user they do not have permission to view that information — do not guess or reveal the underlying data.',
  'If no tool can answer a question, say you do not have that information rather than making something up.',
  'Be concise and clear. Prefer plain language and small tables or lists when presenting data.',
].join(' ');

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly provider: LlmProvider,
    private readonly registry: ToolRegistry,
    private readonly engine: AuthorizationEngine,
  ) {}

  isAvailable(): boolean {
    return this.provider.isConfigured();
  }

  private get maxToolCalls(): number {
    const raw = Number(process.env.ASSISTANT_MAX_TOOL_CALLS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_TOOL_CALLS;
  }

  async chat(ctx: AssistantContext, input: ChatInput): Promise<ChatResult> {
    const tools = this.registry.definitions();
    const messages: LlmMessage[] = [
      ...input.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: input.message },
    ];

    const toolsUsed: string[] = [];
    let toolCallBudget = this.maxToolCalls;

    // Orchestration loop: let the model call tools until it produces text or we
    // hit the call cap.
    // The +2 guards against a provider that never yields text; we still stop.
    for (let turn = 0; turn <= this.maxToolCalls + 1; turn++) {
      let result;
      try {
        result = await this.provider.generate({
          systemInstruction: SYSTEM_INSTRUCTION,
          messages,
          tools,
        });
      } catch (err) {
        // Quota exhaustion (free-tier limit) is a normal, expected outcome —
        // return a clear message rather than a 502 error.
        if (err instanceof LlmError && err.quotaExceeded) {
          return {
            reply:
              "I've hit the usage limit for now (the AI is on a free tier with a per-minute cap). Please wait a minute and try again.",
            toolsUsed,
          };
        }
        throw err;
      }

      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const call of result.toolCalls) {
          if (toolCallBudget <= 0) {
            messages.push({
              role: 'tool',
              toolName: call.name,
              content: JSON.stringify({
                error: 'Tool call limit reached for this message.',
              }),
            });
            continue;
          }
          toolCallBudget -= 1;
          const output = await this.executeTool(ctx, call.name, call.args);
          if (output.executed) toolsUsed.push(call.name);
          messages.push({
            role: 'tool',
            toolName: call.name,
            content: JSON.stringify(output.result),
          });
        }
        continue; // feed tool results back to the model
      }

      // Final text answer.
      return { reply: result.text?.trim() || "I don't have an answer for that.", toolsUsed };
    }

    // Safety net if the model never settled on an answer.
    return {
      reply:
        "I wasn't able to complete that request. Please try rephrasing your question.",
      toolsUsed,
    };
  }

  /**
   * Authorize then execute a single tool. Unknown tools and permission denials
   * return a safe result with no data — never throwing, so the model can relay
   * the outcome to the user.
   */
  private async executeTool(
    ctx: AssistantContext,
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ executed: boolean; result: unknown }> {
    const tool = this.registry.get(name);
    if (!tool) {
      return { executed: false, result: { error: `Unknown tool: ${name}` } };
    }

    // Never execute anything but a read tool in this phase.
    if (tool.mode !== 'read') {
      return {
        executed: false,
        result: { error: 'This assistant is read-only and cannot make changes.' },
      };
    }

    const auth = await authorizeTool(this.engine, ctx, tool);
    if (!auth.allowed) {
      return {
        executed: false,
        result: {
          error:
            'You do not have permission to view this information.',
        },
      };
    }

    // Validate arguments against the tool's schema before execution.
    const parsed = tool.parameters.safeParse(args ?? {});
    if (!parsed.success) {
      return {
        executed: false,
        result: { error: 'Invalid arguments for this tool.' },
      };
    }

    try {
      const data = await tool.run(ctx, parsed.data);
      return { executed: true, result: data };
    } catch (err) {
      this.logger.warn(`Tool ${name} failed: ${(err as Error).message}`);
      return { executed: false, result: { error: 'The tool failed to run.' } };
    }
  }
}
