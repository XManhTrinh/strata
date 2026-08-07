# Implementation Plan: Frontend-Backend Integration

## Overview

This plan connects the Strata frontend to the NestJS backend by building an enhanced API client with token refresh, domain-specific TanStack React Query service modules, a comprehensive database seed script, and wiring frontend pages to live data. Implementation is in TypeScript across the monorepo.

## Tasks

- [x] 1. Enhanced API Client with Token Refresh and Error Handling
  - [x] 1.1 Implement the enhanced `api-client.ts` with token refresh, request queuing, retry logic, and structured error handling
    - Enhance `apps/web/src/lib/api-client.ts` with: `ApiClientError` class (statusCode, message, errors fields), environment-based URL from `NEXT_PUBLIC_API_URL` with `http://localhost:3001` fallback, `Authorization: Bearer` header injection from auth store, 401 interception with single shared refresh promise and request queue, 5xx retry once after 1-second delay, network error detection with friendly message
    - Export the `apiClient<T>(endpoint, options)` function and `ApiClientError` class
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.2 Add `refreshAccessToken` method to the Zustand auth store
    - Update `apps/web/src/lib/auth.ts` to add a `refreshAccessToken()` method that calls `POST /auth/refresh` with the stored refresh token, updates state on success, clears tokens and redirects to `/login` on failure
    - Store refresh token in localStorage under key `strata-refresh-token`
    - _Requirements: 1.1, 1.3, 1.5_

  - [ ]* 1.3 Write property tests for API client (Properties 1, 2, 4, 5, 6)
    - Create `apps/web/src/lib/__tests__/api-client.properties.ts` using fast-check
    - **Property 1: Token refresh and retry** — For any request receiving 401, if refresh succeeds, retry with new token exactly once
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Request queueing during refresh** — For N concurrent 401-triggering requests, all are replayed after single refresh, no duplicates
    - **Validates: Requirements 1.4**
    - **Property 4: Base URL prepend** — For any relative endpoint, resulting URL equals `${baseUrl}${endpoint}`
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - **Property 5: Structured error object** — For any non-2xx response with JSON body, thrown error has correct statusCode, message, errors
    - **Validates: Requirements 4.1, 4.4**
    - **Property 6: 5xx retry with delay** — For any 5xx, retry exactly once after ~1s before throwing
    - **Validates: Requirements 4.2**

  - [ ]* 1.4 Write unit tests for API client
    - Create `apps/web/src/lib/__tests__/api-client.spec.ts`
    - Test specific scenarios: successful request, 401 → refresh → retry, 401 → refresh fail → logout, 5xx → retry → success, 5xx → retry → fail, network error message, concurrent 401 queueing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3_

- [x] 2. Checkpoint — Verify API client
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Domain Service Modules — Core Resources
  - [x] 3.1 Create `people.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/people.service.ts` with `Person` interface, `PaginatedResponse<T>` type, hooks: `usePeople(params)`, `usePerson(id)`, `useCreatePerson()`, `useUpdatePerson()`, `useDeletePerson()`
    - Mutations must invalidate `["people"]` query keys on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.1_

  - [x] 3.2 Create `employees.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/employees.service.ts` with `Employee` interface, hooks: `useEmployees(params)`, `useEmployee(id)`, `useCreateEmployee()`, `useUpdateEmployee()`, `useDeleteEmployee()`
    - Support pagination (`page`, `limit`) and filter params
    - Mutations must invalidate `["employees"]` query keys on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 12.2, 12.3, 12.4_

  - [x] 3.3 Create `organizations.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/organizations.service.ts` with `OrganizationUnit`, `OrganizationUnitType` interfaces, hooks: `useOrgUnits(companyId)`, `useOrgUnit(companyId, id)`, `useCreateOrgUnit()`, `useUpdateOrgUnit()`, `useDeleteOrgUnit()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Create `audit.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/audit.service.ts` with `AuditRecord` interface, hooks: `useAuditLog(params)` supporting pagination and entity filters
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Create `search.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/search.service.ts` with `SearchResult` interface, hooks: `useSearch(query, filters)`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 3.6 Write property test for cache invalidation (Property 3)
    - Create `apps/web/src/services/__tests__/cache-invalidation.properties.ts` using fast-check
    - **Property 3: Mutation cache invalidation** — For any domain service mutation that resolves successfully, the corresponding list query cache keys are invalidated
    - **Validates: Requirements 2.4**

- [x] 4. Domain Service Modules — Engineering, Calendar, Leave, Budgets, Capacity
  - [x] 4.1 Create `engineering.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/engineering.service.ts` with `Tribe`, `Cluster`, `Squad`, `TeamMembership` interfaces, hooks: `useTribes()`, `useTribe(id)`, `useClusters(tribeId)`, `useSquads(clusterId)`, `useTeamMemberships(squadId)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 14.1_

  - [x] 4.2 Create `calendar.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/calendar.service.ts` with `CalendarEvent`, `EventType` interfaces, hooks: `useCalendarEvents(companyId, params)`, `useCreateCalendarEvent()`, `useUpdateCalendarEvent()`, `useDeleteCalendarEvent()`
    - Include date range filtering via `startDate` and `endDate` params
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 13.1_

  - [x] 4.3 Create `leave.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/leave.service.ts` with `CalendarLeaveRequest`, `LeaveBalance`, `LeaveTypeConfig` interfaces, hooks: `useLeaveRequests(companyId)`, `useLeaveBalances(companyId, userId)`, `useCreateLeaveRequest()`, `useUpdateLeaveRequest()`
    - Mutations must invalidate both `["calendar-events"]` and `["leave-balances"]` query keys
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 13.2, 13.3_

  - [x] 4.4 Create `budgets.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/budgets.service.ts` with `Budget` interface, hooks: `useBudgets(params)`, `useBudget(id)`, `useCreateBudget()`, `useUpdateBudget()`, `useDeleteBudget()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.5 Create `capacity.service.ts` with typed React Query hooks
    - Create `apps/web/src/services/capacity.service.ts` with `CapacityAllocation` interface, hooks: `useCapacityAllocations(params)`, `useCapacityOverview(employeeId)`, `useUpdateCapacityAllocation()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 14.2, 14.3_

  - [ ]* 4.6 Write property test for query parameter passthrough (Property 13)
    - Create `apps/web/src/services/__tests__/query-params.properties.ts` using fast-check
    - **Property 13: Query parameter passthrough** — For any combination of pagination and filter params passed to service hooks, the underlying apiClient call includes those exact params as query string values
    - **Validates: Requirements 12.3, 12.4**

- [x] 5. Checkpoint — Verify service modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Database Seed Script
  - [x] 6.1 Create seed script scaffold with Company and Organization structure
    - Create `packages/database/src/seed.ts` with PrismaClient initialization, progress logging, and error handling
    - Implement `seedCompany()` — upsert "Acme Corp" with slug "acme-corp"
    - Implement `seedOrgUnitTypes(companyId)` — create at least 3 types (Department, Tribe, Squad)
    - Implement `seedOrgUnits(companyId, types)` — create at least 5 units in a hierarchical tree with 2+ levels, populate `path` field correctly
    - Use `prisma.*.upsert()` with deterministic IDs for idempotency
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.2, 10.3_

  - [x] 6.2 Implement seed functions for Users, Roles, and Reporting
    - Implement `seedUsers(companyId, orgUnits, positions)` — create at least 10 User records with linked Person and Employee entities, passwords hashed with bcrypt using "Test1234!"
    - Implement `seedRoles(companyId)` — create at least 3 RoleV2 records (Admin, Manager, Employee) with permissions
    - Implement `seedRoleAssignments(companyId, users, roles)` — assign via UserCompanyMembership and RoleAssignmentV2, cover all 6 PermissionScopeV2 values
    - Implement `seedReportingRelationships(companyId, users)` — create at least 2 manager-report chains
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.3 Implement seed functions for Calendar and Leave data
    - Implement `seedEventTypes(companyId)` — create at least 3 EventType records (Meeting, Holiday, Out of Office)
    - Implement `seedLeaveTypes(companyId)` — create at least 2 LeaveTypeConfig records (Annual Leave, Sick Leave) with default allocations
    - Implement `seedCalendarEvents(companyId, users, eventTypes)` — create at least 10 events spread across current and next month, include at least 1 recurring event
    - Implement `seedLeaveBalances(companyId, users, leaveTypes)` — create LeaveBalance for each user/type pair for current year with `allocated` matching `defaultAllocation`
    - Implement `seedLeaveRequests(companyId, users, leaveTypes, eventTypes)` — create at least 5 CalendarLeaveRequest records with mix of PENDING, APPROVED, REJECTED statuses
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.4 Implement seed functions for Engineering structure, Capacity, and Budgets
    - Implement `seedEngineering(companyId)` — create at least 2 Tribes, 3 Clusters, 4 Squads forming a hierarchy
    - Implement `seedTeamMemberships(employees, squads)` — assign employees to squads with roles
    - Implement `seedCapacityAllocations(employees, squads)` — create allocations with percentages summing to 100 per employee
    - Implement `seedBudgets(orgUnits)` — create budgets for at least 3 departments across 2 fiscal periods (FY2024-Q3, FY2024-Q4) with amounts between 50,000 and 500,000
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2_

  - [x] 6.5 Add `pnpm db:seed` script and completion logging
    - Add `"db:seed"` script to root `package.json` that executes `ts-node packages/database/src/seed.ts`
    - Add summary logging at end of seed script showing record counts per entity
    - Ensure non-zero exit code on database error
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

  - [ ]* 6.6 Write property tests for seed script (Properties 7, 8, 9, 10, 11, 12)
    - Create `packages/database/src/__tests__/seed.properties.ts` using fast-check
    - **Property 7: Seed idempotency** — Running seed N≥2 times produces identical record counts
    - **Validates: Requirements 5.5**
    - **Property 8: Organization unit path correctness** — Each OrganizationUnit path correctly represents ancestor chain
    - **Validates: Requirements 5.4**
    - **Property 9: Seed password verification** — `bcrypt.compare("Test1234!", user.passwordHash)` returns true for all seeded users
    - **Validates: Requirements 6.5**
    - **Property 10: Leave balance completeness** — For every (user, leaveType) pair, a LeaveBalance exists with correct allocation
    - **Validates: Requirements 7.4**
    - **Property 11: Capacity allocation sum** — For every employee with allocations, percentages sum to exactly 100
    - **Validates: Requirements 8.3**
    - **Property 12: Budget amount range** — Every seeded budget has amount between 50,000 and 500,000 inclusive
    - **Validates: Requirements 9.2**

- [x] 7. Checkpoint — Verify seed script
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend Page Wiring
  - [x] 8.1 Wire the Dashboard page to live backend data
    - Update the dashboard page to use appropriate service hooks for summary data (e.g., employee count, pending leave requests, upcoming events)
    - Implement loading skeleton state while data is fetching
    - Implement error state with retry button on fetch failure
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 8.2 Wire the People page to live backend data
    - Update the people list page to use `usePeople()` hook with pagination params (`page`, `pageSize`)
    - Pass search/filter terms to the backend via query params
    - Implement loading and error states
    - _Requirements: 12.1, 12.3, 12.4_

  - [x] 8.3 Wire the Employees page to live backend data
    - Update the employees list page to use `useEmployees()` hook with pagination and filter support
    - Implement loading and error states
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 8.4 Wire the Calendar page to live backend data
    - Update the calendar page to use `useCalendarEvents()` hook with date range params for the visible period
    - Implement leave request creation via `useCreateLeaveRequest()` mutation
    - Ensure cache invalidation of calendar events and leave balances on successful leave submission
    - Implement loading and error states
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 8.5 Wire the Engineering and Capacity pages to live backend data
    - Update engineering page to use `useTribes()`, `useClusters()`, `useSquads()` hooks to render hierarchy
    - Update capacity page to use `useCapacityAllocations()` hook displaying percentage allocations
    - Implement loading and error states
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ]* 8.6 Write unit tests for page components
    - Test dashboard, people, employees, calendar, engineering pages with mocked service hooks
    - Verify loading skeleton renders during fetch
    - Verify error state with retry button renders on failure
    - Verify data renders correctly on success
    - _Requirements: 11.1, 11.2, 11.3, 12.1, 13.1, 14.1_

- [x] 9. CORS Configuration Verification
  - [x] 9.1 Verify and configure CORS settings in the NestJS backend
    - Ensure `apps/api/src/main.ts` configures CORS with `origin` from `CORS_ORIGIN` env var, allows `Content-Type`, `Authorization`, `X-Request-ID` headers, and enables credentials
    - Add `.env.example` documentation for `CORS_ORIGIN` variable
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 9.2 Write integration test for CORS preflight
    - Test that OPTIONS request returns correct `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, and `Access-Control-Allow-Credentials` headers
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 10. Final Checkpoint — Full Integration Verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The seed script uses `upsert` operations for idempotency — safe to run multiple times
- All service modules follow the same pattern: typed interfaces + React Query hooks with cache invalidation on mutations
