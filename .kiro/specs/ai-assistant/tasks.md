# Implementation Plan: AI Assistant (Phase 1 — Read-Only)

## Overview

This plan builds a read-only, permission-safe AI assistant into Strata. We create an `AssistantModule` in the NestJS API that runs a Gemini-backed tool loop. Tools wrap existing read services and are gated by the existing `AuthorizationEngine`, with compensation fields redacted server-side before any data reaches the model. The frontend adds a chat panel that posts to the assistant endpoint. Writes are out of scope.

Tasks marked `*` are optional (tests) and can be deferred for a faster first cut, but the security property tests (Tasks 5.2, 5.3) are strongly recommended given the sensitivity.

## Tasks

- [ ] 1. Scaffold AssistantModule, types, and config
  - [ ] 1.1 Create `apps/api/src/assistant/assistant.types.ts`
    - Define `AssistantContext`, `ChatInput`, `ChatResult`, `AssistantMessage`, `AssistantTool`, `LlmProvider`, `LlmGenerateInput`, `LlmGenerateResult`, `LlmToolCall`, `LlmToolDefinition`
    - _Requirements: 1.1, 2.3, 3.1_
  - [ ] 1.2 Create `apps/api/src/assistant/assistant.module.ts`
    - Register controller, service, `GeminiProvider`, `ToolRegistry`
    - Import `RateCardsModule`, the people module, `OrgChartModule`, and `AuthorizationModule` to access their services + `AuthorizationEngine`
    - _Requirements: 1.1, 3.3, 8.1_
  - [ ] 1.3 Register `AssistantModule` in `apps/api/src/app.module.ts`
    - _Requirements: 1.1_
  - [ ] 1.4 Add assistant env vars to `apps/api/.env.example`
    - `GEMINI_API_KEY`, `GEMINI_MODEL`, `ASSISTANT_MAX_TOOL_CALLS`, `ASSISTANT_REQUEST_TIMEOUT_MS`, `ASSISTANT_RATE_LIMIT_PER_MIN`
    - Do NOT put a real key here; document it for local `.env`
    - _Requirements: 2.1, 2.2, 3.7, 6.3_

- [ ] 2. Implement the LLM provider abstraction (Gemini)
  - [ ] 2.1 Define the `LlmProvider` interface in the providers folder
    - `generate(input): Promise<LlmGenerateResult>` returning either `text` or `toolCalls`
    - _Requirements: 2.3, 2.4_
  - [ ] 2.2 Implement `GeminiProvider` (`apps/api/src/assistant/providers/gemini.provider.ts`)
    - Read `GEMINI_API_KEY` / `GEMINI_MODEL` from env; fail closed if key missing
    - Map `LlmGenerateInput` (system instruction, messages, tool defs) to Gemini `generateContent` function-calling format
    - Parse Gemini response into `text` or `toolCalls`
    - Enforce `ASSISTANT_REQUEST_TIMEOUT_MS`; normalize errors; never log the key
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 5(err)_
  - [ ]* 2.3 Unit tests for `GeminiProvider`
    - Tool defs mapped correctly; missing key → unavailable; timeout → recoverable error; key never appears in logs
    - _Requirements: 2.1, 2.2, 2.5_

- [ ] 3. Build the read-only Tool Registry
  - [ ] 3.1 Create `ToolRegistry` (`apps/api/src/assistant/tools/tool-registry.ts`)
    - Hold `AssistantTool[]`; emit LLM function declarations (name, description, JSON schema from each tool's Zod `parameters`)
    - Look up a tool by name; return undefined for unknown names
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [ ] 3.2 Implement rate-card read tools
    - `list_rate_cards`, `list_rate_card_groups`, `list_rate_card_sets` wrapping `RateCardsService` methods
    - Each declares `mode: 'read'` and its `requiredPermission` (rate-cards read; resolve exact key from feature registry)
    - Scope results to `ctx.companyId`
    - _Requirements: 3.1, 3.2, 3.3, 4.1_
  - [ ] 3.3 Implement people read tools
    - `list_people` (bounded, filters: search/orgUnit/employmentType/limit) and `count_people` wrapping the people service
    - Declare `requiredPermission` (people read); scope to `ctx.companyId`
    - Apply `redactPeople` before returning (see Task 4.2)
    - _Requirements: 3.1, 3.2, 3.3, 8.3, 8.4_

- [ ] 4. Implement authorization + redaction helpers
  - [ ] 4.1 Implement `authorizeTool(ctx, tool)` (`apps/api/src/assistant/authz/authorize-tool.ts`)
    - Call `AuthorizationEngine.evaluate({ userId, companyId, feature, permission })` using the tool's `requiredPermission`
    - Return `{ allowed, scope }`; if `requiredPermission` is null/unresolvable → deny (fail closed)
    - _Requirements: 3.8, 8.1, 8.2, 8.6, 8.7_
  - [ ] 4.2 Implement `redactPeople(ctx, people, scope)` (`apps/api/src/assistant/authz/redact-people.ts`)
    - Reuse the subordinate-set / super-admin / company-comp logic used by `OrgChartService` for `canSeeSalary`
    - Null out `annualSalary`, `dayRate`, `annualCost`, and `Annual Salary`/`Day Rate` metadata for people the caller may not see them for
    - _Requirements: 8.3, 8.4, 8.5, 4.5_
  - [ ]* 4.3 Unit tests for redaction helper
    - Salary visible for self + subordinates + super-admin/company-comp; hidden otherwise
    - _Requirements: 8.3, 8.5_

- [ ] 5. Implement the AssistantService orchestration loop
  - [ ] 5.1 Implement `AssistantService.chat(ctx, input)` (`apps/api/src/assistant/assistant.service.ts`)
    - Build system instruction (read-only assistant; answer only from tool data; refuse writes; company-scoped)
    - Loop: call provider with tool defs → if `toolCalls`, for each call `authorizeAndExecute` → feed results back → repeat until `text` or `ASSISTANT_MAX_TOOL_CALLS`
    - `authorizeAndExecute`: reject unknown tool (Task 3.1); `authorizeTool` (Task 4.1); validate args against Zod schema; run tool; on denial return a "no permission" tool result with no data
    - Never execute an instruction from model output other than a registry tool call
    - Return `{ reply, toolsUsed }`
    - _Requirements: 1.1, 3.3, 3.4, 3.5, 3.7, 4.1, 4.2, 4.3, 6.2, 8.2_
  - [ ]* 5.2 Property test: No unauthorized tool execution (**Property 1**)
    - fast-check: random permission configs + tool calls; assert underlying service NOT invoked when denied (spy)
    - **Validates: Requirements 3.3, 3.4, 8.1, 8.2**
  - [ ]* 5.3 Property test: Compensation redaction (**Property 2**)
    - fast-check: random people + caller scope; assert salary/cost null for everyone outside allowed set
    - **Validates: Requirements 8.3, 8.4, 8.5, 4.5**
  - [ ]* 5.4 Property test: Company isolation + bounded loop (**Properties 3, 5**)
    - Assert results only reference request company; tool executions ≤ cap
    - **Validates: Requirements 1.3, 4.4, 3.7**

- [ ] 6. Implement the AssistantController
  - [ ] 6.1 Create `AssistantController` (`apps/api/src/assistant/assistant.controller.ts`)
    - Route `@Controller('companies/:companyId/assistant')`, `POST chat`
    - Read `request.user.sub`; resolve Prisma user id; verify membership in `:companyId` → 403 if not
    - Zod-validate body (message non-empty/max length; history bounded)
    - Apply per-user rate limit → 429 when exceeded
    - Map errors: missing key → 503, provider error/timeout → 502, no credential/stack leak
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 6.3_
  - [ ]* 6.2 Unit tests for controller
    - 401 unauth (guard), 403 non-member, 400 oversized input, 429 over limit, 503 no key
    - _Requirements: 1.2, 1.4, 1.6, 2.2, 6.3_

- [ ] 7. Add audit logging
  - [ ] 7.1 Log each interaction
    - Record Caller_Identity, Company_ID, timestamp, tools invoked, success/failure — no secrets, no full transcript required
    - Use the existing logging/audit approach in the API
    - _Requirements: 6.1_

- [ ] 8. Checkpoint — backend tests pass
  - Run API build + tests; ensure all pass. Ask the user if questions arise.

- [ ] 9. Frontend service hook
  - [ ] 9.1 Create `apps/web/src/services/assistant.service.ts`
    - Types: `AssistantMessage`, `ChatRequest`, `ChatResponse`
    - `useAssistantChat(companyId)` — TanStack Query mutation posting to `/companies/${companyId}/assistant/chat` via `apiClient`
    - _Requirements: 1.1, 5.5_
  - [ ] 9.2 Export from `apps/web/src/services/index.ts`
    - _Requirements: 1.1_

- [ ] 10. Frontend AssistantPanel UI
  - [ ] 10.1 Create `apps/web/src/components/assistant/assistant-panel.tsx`
    - `@vkieu/mui` panel/drawer: scrollable transcript, `TextField` input, send `Button`, in-progress indicator
    - Local conversation state; send `{ message, history }`, append reply; company id from `useCompanyId()`
    - Error surface with retry; disable submit while pending
    - Accessibility: `role="log"` transcript, labeled input, Enter-to-send, focus management
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ] 10.2 Add a launcher and mount the panel in the app shell
    - Icon button that toggles the panel; mount within the dashboard shell
    - _Requirements: 5.1_
  - [ ]* 10.3 Frontend tests
    - Hook posts correct body; panel shows pending/error; disabled while pending; accessible roles present
    - _Requirements: 5.3, 5.4, 5.6_

- [ ] 11. Checkpoint — end-to-end with stubbed provider
  - [ ]* 11.1 Integration test: "how many people in UK?" → tool runs under real authz → safe answer
    - _Requirements: 4.1, 8.1_
  - [ ]* 11.2 Integration test (headline security): employee without comp permission asks "what is Jane's salary?" → no salary returned, assistant states unavailable; super-admin gets it
    - _Requirements: 8.2, 8.3, 8.5_
  - [ ] 11.3 Manual verification with a real Gemini key in local `.env`
    - Confirm a read question answers correctly and a write request is politely refused
    - _Requirements: 4.1, 4.3_

- [ ] 12. Final checkpoint — full build + tests pass
  - Run web + api builds and tests; ensure all pass. Ask the user if questions arise.

## Notes

- Tasks marked `*` are optional tests; **Tasks 5.2 and 5.3 (permission + salary redaction property tests) are strongly recommended** given the security sensitivity.
- LLM calls are stubbed via the `LlmProvider` interface in all automated tests — no real Gemini calls in CI.
- Every tool call is authorized server-side via the existing `AuthorizationEngine`; compensation fields are redacted before data reaches the model.
- No write tool is implemented, registered, or reachable in this phase.
- The Gemini key lives only in server env; it is never shipped to the client or committed.
