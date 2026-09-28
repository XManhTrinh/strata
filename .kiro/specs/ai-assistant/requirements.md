# Requirements Document

## Introduction

This feature adds an in-app AI assistant to Strata: a chat panel where an authenticated user can ask natural-language questions about their company's data and receive grounded answers. The assistant is powered by the Google Gemini API and reaches Strata data exclusively through the existing NestJS API (never raw SQL and never the database directly), so all authentication, company scoping, and authorization rules continue to apply.

Because the assistant is a new path to company data, **it must enforce Strata's existing roles and permissions exactly as the UI does.** The assistant must never become a way around access control: a user may only see through the assistant what they could see through the app. In particular, an employee without compensation-visibility permission must not be able to obtain another person's salary by asking the assistant. Permission and field-level redaction (e.g. salary) are applied server-side, before any data reaches the language model.

This spec covers **Phase 1: read-only**. The assistant can answer questions and summarize data by calling read-only "tools" (wrappers over existing read endpoints). It cannot create, update, or delete anything. Write actions (e.g. "add a rate card", "move a user") are explicitly **out of scope** for this phase and are captured as a future phase so the design can leave room for them.

## Glossary

- **AI_Assistant**: The overall feature — a chat experience embedded in the Strata web app backed by an AI orchestration service.
- **Assistant_Service**: The backend NestJS module that receives a chat message, calls the LLM, executes tool calls, and returns a reply.
- **LLM_Provider**: The external large-language-model API (Google Gemini) invoked by the Assistant_Service. Configured via server environment, never exposed to the client.
- **Tool**: A named, typed function the LLM may invoke to read Strata data. Each Tool wraps an existing read-only service method and runs under the caller's identity and company scope.
- **Tool_Registry**: The catalog of available Tools with their JSON-schema argument definitions, presented to the LLM as callable functions.
- **Assistant_API**: The REST endpoint(s) under `/companies/:companyId/assistant` that the frontend calls.
- **Assistant_Panel**: The frontend chat UI (a panel/drawer) with message history and streaming replies.
- **Conversation**: An ordered list of user and assistant messages within a single chat session.
- **Company_ID**: The company scope for all assistant queries; every Tool call is constrained to this company.
- **Caller_Identity**: The authenticated user (from the existing AuthGuard) on whose behalf the assistant acts.
- **Authorization_Engine**: The existing NestJS service that decides whether a user may perform a feature-permission, resolving scope (OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, GLOBAL) and super-admin bypass.
- **Permission_Scope**: The breadth at which a permission applies to a target (self, direct reports, org unit, branch, company, global), determining which people/records a Caller_Identity may access.
- **Field_Redaction**: Removing or nulling sensitive fields (e.g. salary, day rate, annual cost) from a Tool result before it leaves the server, based on the Caller_Identity's permission to see that field for that person.

## Requirements

### Requirement 1: Assistant Chat Endpoint

**User Story:** As a Strata user, I want to send a natural-language message to an assistant, so that I can ask questions about my company's data conversationally.

#### Acceptance Criteria

1. WHEN a POST request is made to `/companies/:companyId/assistant/chat` with a message and prior conversation, THE Assistant_API SHALL return the assistant's reply for that message.
2. THE Assistant_API SHALL require valid authentication and SHALL reject unauthenticated requests with HTTP 401.
3. THE Assistant_Service SHALL constrain every Tool call it performs to the Company_ID from the request path.
4. WHEN the authenticated Caller_Identity is not a member of the requested Company_ID, THE Assistant_API SHALL reject the request with HTTP 403.
5. WHEN the LLM_Provider is unavailable or returns an error, THE Assistant_API SHALL return a descriptive error to the client without exposing provider credentials or internal stack traces.
6. THE Assistant_API SHALL accept a bounded conversation history and SHALL reject requests whose history exceeds a configured maximum length.

### Requirement 2: LLM Provider Integration (Gemini)

**User Story:** As a system operator, I want the assistant to use the Gemini API via server-side configuration, so that the model credentials stay secret and the provider can be changed without a rewrite.

#### Acceptance Criteria

1. THE Assistant_Service SHALL read the Gemini API key and model name from server environment variables and SHALL NOT expose them to the frontend.
2. IF the Gemini API key is not configured, THEN THE Assistant_Service SHALL fail closed and the Assistant_API SHALL report that the assistant is unavailable.
3. THE Assistant_Service SHALL send the user message, conversation history, a system instruction, and the Tool_Registry function definitions to the LLM_Provider.
4. THE Assistant_Service SHALL isolate provider-specific request/response shaping behind a single provider abstraction so that swapping LLM_Provider requires changing only that layer.
5. THE Assistant_Service SHALL enforce a request timeout on LLM_Provider calls and SHALL surface a timeout as a recoverable error.

### Requirement 3: Read-Only Tool Registry

**User Story:** As a security-conscious owner, I want the assistant to only be able to read data through defined tools, so that it cannot modify or corrupt the database.

#### Acceptance Criteria

1. THE Tool_Registry SHALL contain only read-only Tools in this phase; no Tool SHALL create, update, or delete data.
2. THE Tool_Registry SHALL expose, at minimum, Tools to: list rate cards, list rate card groups, list rate card sets, and list/count people (company members) with basic filters.
3. THE Assistant_Service SHALL execute a Tool only by invoking the corresponding existing read-only service method, passing the request's Company_ID and Caller_Identity.
4. WHEN the LLM requests a Tool that is not in the Tool_Registry, THE Assistant_Service SHALL refuse the call and SHALL NOT execute any database operation.
5. THE Assistant_Service SHALL validate every Tool call's arguments against the Tool's schema before execution and SHALL reject invalid arguments.
6. THE Assistant_Service SHALL enforce the Caller_Identity's existing permissions when executing a Tool (see Requirement 8), so the assistant cannot read data the user could not read through the normal UI.
7. THE Assistant_Service SHALL cap the number of Tool calls executed per user message to a configured maximum to prevent runaway loops.
8. EACH Tool SHALL declare the feature and permission it requires; THE Assistant_Service SHALL evaluate that requirement via the existing authorization engine before executing the Tool and SHALL refuse Tools the Caller_Identity is not permitted to use.

### Requirement 4: Grounded Answering

**User Story:** As a user, I want the assistant's answers to reflect my actual data, so that I can trust what it tells me.

#### Acceptance Criteria

1. WHEN answering a data question, THE Assistant_Service SHALL base the answer on values returned by Tool calls rather than unsupported model recall.
2. WHEN no Tool can satisfy a request, THE Assistant_Service SHALL state that it cannot answer rather than fabricating data.
3. WHEN a user asks the assistant to make a change (create/update/delete), THE Assistant_Service SHALL explain that it is read-only in this phase and SHALL NOT attempt any modification.
4. THE Assistant_Service SHALL constrain answers to the caller's company and SHALL NOT reveal data from other companies.
5. THE Assistant_Service SHALL never surface a field or record that has been redacted by permission enforcement (Requirement 8), even if the model requests or infers it.

### Requirement 5: Assistant Panel UI

**User Story:** As a user, I want a chat panel in the Strata web app, so that I can converse with the assistant without leaving my workflow.

#### Acceptance Criteria

1. THE Assistant_Panel SHALL provide a message input, a send action, and a scrollable Conversation view showing user and assistant messages in order.
2. THE Assistant_Panel SHALL be built with `@vkieu/mui` components consistent with Strata's design conventions.
3. WHILE the assistant is generating a reply, THE Assistant_Panel SHALL show a visible in-progress indicator and SHALL disable duplicate submissions.
4. WHEN the Assistant_API returns an error, THE Assistant_Panel SHALL show the error to the user and allow retry.
5. THE Assistant_Panel SHALL send the Company_ID from the active workspace context with each request.
6. THE Assistant_Panel SHALL be accessible: keyboard-operable input and send, focus management, and appropriate ARIA roles for the chat log.

### Requirement 6: Safety, Privacy, and Auditing

**User Story:** As an owner, I want assistant usage to be safe and traceable, so that we control data exposure and can review activity.

#### Acceptance Criteria

1. THE Assistant_Service SHALL log each assistant interaction with the Caller_Identity, Company_ID, timestamp, the Tools invoked, and whether the call succeeded — without logging secret credentials.
2. THE Assistant_Service SHALL treat all model output as untrusted and SHALL NOT execute any instruction from model output other than validated Tool calls from the Tool_Registry.
3. THE Assistant_Service SHALL apply a per-user rate limit to assistant requests and SHALL reject requests over the limit with a clear message.
4. THE system SHALL document that the configured LLM_Provider tier may process request content, so sensitive data handling can be reviewed before production use.

### Requirement 8: Permission and Field-Level Enforcement

**User Story:** As an employee without HR privileges, I want the assistant to refuse to reveal data I'm not allowed to see — such as other people's salaries — so that the assistant can never become a way around Strata's roles and permissions.

#### Acceptance Criteria

1. THE Assistant_Service SHALL enforce authorization for every Tool call using the same authorization engine and scope model (OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, GLOBAL) that governs the equivalent UI action, evaluated for the Caller_Identity within the request's Company_ID.
2. WHEN the Caller_Identity lacks the required feature-permission for a Tool, THE Assistant_Service SHALL NOT execute that Tool and SHALL have the assistant explain that the user does not have permission — without disclosing the withheld data.
3. THE Assistant_Service SHALL apply the same field-level redaction as the underlying read services, including compensation fields (salary, day rate, annual cost): a compensation field SHALL be returned to the model only for people the Caller_Identity is permitted to see it for (e.g. self, direct/indirect reports per scope, or a company-wide compensation permission / super admin).
4. WHEN a Tool result would include a person or field the Caller_Identity may not see, THE Assistant_Service SHALL omit or redact that person or field BEFORE the data is sent to the LLM_Provider, so unauthorized data never reaches the model or the reply.
5. WHEN an employee without compensation-visibility asks for another person's salary or cost, THE Assistant_Service SHALL return no salary value and the assistant SHALL state that the information is not available to them.
6. THE Assistant_Service SHALL derive permission decisions server-side from the Caller_Identity and SHALL NOT rely on any role, permission, scope, or company claim supplied by the client request body or by the model.
7. THE Assistant_Service SHALL default to denying access when a Tool's permission requirement cannot be determined, rather than returning data.

### Requirement 9: Future Write Actions (Out of Scope — Reserved)

**User Story:** As a product owner, I want the design to anticipate write actions, so that adding them later does not require re-architecting.

#### Acceptance Criteria

1. THE design SHALL describe how write Tools would be added in a later phase behind an explicit user confirmation step.
2. THE Tool_Registry structure SHALL allow marking a Tool as read-only or write so a future phase can require confirmation for writes.
3. Write Tools SHALL NOT be implemented, registered, or reachable in this phase.
4. WHEN write Tools are added later, THEY SHALL enforce the same permission model as Requirement 8 for the write action (e.g. a user may only create/modify records they are authorized to change).
