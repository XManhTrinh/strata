# Requirements Document

## Introduction

This feature connects the Strata frontend (Next.js) to the real backend (NestJS) API endpoints, replacing all mock/static data with live data fetched from the API. It also provides a database seed script that populates PostgreSQL with realistic sample data so the application can be demonstrated and developed against meaningful state.

## Glossary

- **API_Client**: The typed HTTP service layer in the frontend (`apps/web/src/lib/api-client.ts`) that handles requests to the Backend, including authentication headers, error handling, and token refresh.
- **API_Service_Module**: A domain-specific module in the frontend (e.g., `people.service.ts`) that wraps API_Client calls with TanStack Query hooks for a specific resource.
- **Backend**: The NestJS application at `apps/api` providing REST endpoints for all domain modules.
- **Frontend**: The Next.js application at `apps/web` that renders the user interface.
- **Seed_Script**: A CLI-executable TypeScript script that populates the database with realistic sample data using Prisma Client.
- **Token_Refresh**: The process of exchanging an expired access token for a new one using a stored refresh token, without requiring re-authentication.
- **React_Query**: TanStack React Query v5, the data-fetching and caching library already installed in the Frontend.
- **Company**: The top-level tenant entity in the V2 permission system (Prisma model `Company`).
- **Organization_Unit**: A configurable structural unit within a Company (departments, tribes, squads, etc.).
- **Leave_Balance**: The allocated, used, and remaining leave entitlement for a user in a given year.

## Requirements

### Requirement 1: API Client Token Refresh

**User Story:** As a frontend user, I want my session to remain active transparently, so that I do not get logged out unexpectedly while using the application.

#### Acceptance Criteria

1. WHEN the API_Client receives a 401 response from the Backend, THE API_Client SHALL attempt to refresh the access token using the stored refresh token by calling the `/auth/refresh` endpoint.
2. WHEN Token_Refresh succeeds, THE API_Client SHALL retry the original failed request with the new access token.
3. IF Token_Refresh fails, THEN THE API_Client SHALL clear the stored tokens and redirect the user to the login page.
4. WHILE a Token_Refresh request is in-flight, THE API_Client SHALL queue all other requests and replay them after the refresh completes.
5. THE API_Client SHALL store the refresh token in localStorage under the key `strata-refresh-token`.

### Requirement 2: Typed API Service Modules

**User Story:** As a frontend developer, I want domain-specific service modules with TypeScript types, so that I can consume backend data with full type safety and IDE autocompletion.

#### Acceptance Criteria

1. THE Frontend SHALL provide an API_Service_Module for each domain: people, employees, engineering, calendar, leave, budgets, capacity, organizations, audit, and search.
2. WHEN an API_Service_Module is imported, THE API_Service_Module SHALL export React_Query hooks (`useQuery` / `useMutation` wrappers) for each CRUD operation available on the corresponding Backend endpoint.
3. THE API_Service_Module SHALL define TypeScript interfaces matching the response shapes returned by the Backend for each endpoint.
4. WHEN an API_Service_Module mutation succeeds, THE API_Service_Module SHALL invalidate relevant React_Query cache entries to trigger automatic refetching of stale data.

### Requirement 3: Environment-Based API URL Configuration

**User Story:** As a developer, I want the API URL to be configurable per environment, so that the frontend can connect to local, staging, or production backends without code changes.

#### Acceptance Criteria

1. THE Frontend SHALL read the Backend base URL from the environment variable `NEXT_PUBLIC_API_URL`.
2. IF `NEXT_PUBLIC_API_URL` is not set, THEN THE Frontend SHALL default to `http://localhost:3001`.
3. THE API_Client SHALL prepend the configured base URL to all relative endpoint paths.

### Requirement 4: Error Handling and User Feedback

**User Story:** As a user, I want to see meaningful error messages when API calls fail, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. WHEN the Backend returns a 4xx error with a `message` field, THE API_Client SHALL surface that message to the calling component.
2. WHEN the Backend returns a 5xx error, THE API_Client SHALL retry the request once after a 1-second delay before surfacing the error.
3. WHEN a network error occurs (no response received), THE API_Client SHALL report a "Network error. Please check your connection." message.
4. THE API_Client SHALL expose a structured error object containing `statusCode`, `message`, and optional `errors` field to calling code.

### Requirement 5: Seed Script — Company and Organization Structure

**User Story:** As a developer, I want a seed script that creates a realistic company with departments and teams, so that I can develop and demo the application with representative data.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL create one Company entity with name "Acme Corp" and slug "acme-corp".
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 3 OrganizationUnitType records (e.g., "Department", "Tribe", "Squad").
3. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 5 OrganizationUnit records forming a hierarchical tree with at least 2 levels of nesting.
4. WHEN the Seed_Script is executed, THE Seed_Script SHALL populate the `path` field on each OrganizationUnit for materialized-path queries.
5. THE Seed_Script SHALL be idempotent: running it multiple times SHALL produce the same final state without duplicating data.

### Requirement 6: Seed Script — Users and Roles

**User Story:** As a developer, I want seed data with users assigned to different roles, so that I can test authorization behavior and role-based UI variations.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 10 User records linked to Person and Employee entities.
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 3 RoleV2 records (e.g., "Admin", "Manager", "Employee") with associated permissions.
3. WHEN the Seed_Script is executed, THE Seed_Script SHALL assign users to roles via UserCompanyMembership and RoleAssignmentV2, covering all 6 PermissionScopeV2 values across the dataset.
4. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 2 ReportingRelationship records establishing manager-report chains.
5. WHEN the Seed_Script is executed, THE Seed_Script SHALL create user passwords using bcrypt hashing with a known default password "Test1234!" for all seeded users.

### Requirement 7: Seed Script — Calendar and Leave Data

**User Story:** As a developer, I want seed data with calendar events and leave requests, so that I can develop calendar views and leave management features against realistic data.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 3 EventType records (e.g., "Meeting", "Holiday", "Out of Office").
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 2 LeaveTypeConfig records (e.g., "Annual Leave", "Sick Leave") with default allocations.
3. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 10 CalendarEvent records spread across the current and next month, including at least one recurring event.
4. WHEN the Seed_Script is executed, THE Seed_Script SHALL create LeaveBalance records for each user and leave type for the current year.
5. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 5 CalendarLeaveRequest records with a mix of PENDING, APPROVED, and REJECTED statuses.

### Requirement 8: Seed Script — Engineering Structure

**User Story:** As a developer, I want seed data for tribes, clusters, and squads with team memberships, so that I can develop engineering hierarchy views.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL create at least 2 Tribe records, 3 Cluster records, and 4 Squad records forming a complete engineering hierarchy.
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL create TeamMembership records assigning employees to squads with appropriate roles.
3. WHEN the Seed_Script is executed, THE Seed_Script SHALL create CapacityAllocation records for employees assigned to squads with percentage values summing to 100 per employee.

### Requirement 9: Seed Script — Budgets

**User Story:** As a developer, I want seed data with budget allocations, so that I can develop budgeting views and reports.

#### Acceptance Criteria

1. WHEN the Seed_Script is executed, THE Seed_Script SHALL create Budget records for at least 3 departments covering 2 fiscal periods (e.g., "FY2024-Q3", "FY2024-Q4").
2. WHEN the Seed_Script is executed, THE Seed_Script SHALL assign budget amounts that are realistic (between 50,000 and 500,000).

### Requirement 10: Seed Script Execution

**User Story:** As a developer, I want to run the seed script with a simple command, so that I can quickly populate or reset my local database.

#### Acceptance Criteria

1. THE Seed_Script SHALL be executable via `pnpm db:seed` from the repository root.
2. THE Seed_Script SHALL connect to the database using the `DATABASE_URL` environment variable.
3. WHEN the Seed_Script starts, THE Seed_Script SHALL log progress indicating which entity group is being seeded.
4. WHEN the Seed_Script completes successfully, THE Seed_Script SHALL log a summary of created records.
5. IF the Seed_Script encounters a database error, THEN THE Seed_Script SHALL log the error message and exit with a non-zero code.

### Requirement 11: Frontend Page Wiring — Dashboard

**User Story:** As a user, I want the dashboard to display real data from the backend, so that I see actual metrics and summaries instead of placeholder content.

#### Acceptance Criteria

1. WHEN the dashboard page loads, THE Frontend SHALL fetch summary data from the Backend using the appropriate API_Service_Module hooks.
2. WHILE data is loading, THE Frontend SHALL display loading skeleton states.
3. IF data fetching fails, THEN THE Frontend SHALL display an error state with a retry button.

### Requirement 12: Frontend Page Wiring — People and Employees

**User Story:** As a user, I want people and employee lists to show real data with pagination, so that I can browse and manage actual employee records.

#### Acceptance Criteria

1. WHEN the people list page loads, THE Frontend SHALL fetch people records from `GET /people` using the people API_Service_Module.
2. WHEN the employees list page loads, THE Frontend SHALL fetch employee records from `GET /employees` using the employees API_Service_Module.
3. THE Frontend SHALL support server-side pagination by passing `page` and `limit` query parameters to the Backend.
4. WHEN a user applies filters or search terms, THE Frontend SHALL pass filter parameters to the Backend and display filtered results.

### Requirement 13: Frontend Page Wiring — Calendar and Leave

**User Story:** As a user, I want calendar views and leave management to use real data, so that I can see actual events and submit real leave requests.

#### Acceptance Criteria

1. WHEN the calendar page loads, THE Frontend SHALL fetch calendar events from `GET /calendar/events` for the displayed date range.
2. WHEN a user creates a leave request, THE Frontend SHALL submit it via `POST /calendar/leave-requests` using the calendar API_Service_Module.
3. WHEN a leave request is submitted successfully, THE Frontend SHALL invalidate the calendar events cache and leave balance cache to show updated data.

### Requirement 14: Frontend Page Wiring — Engineering and Capacity

**User Story:** As a user, I want engineering hierarchy and capacity views to use real data, so that I can see actual team structures and allocation percentages.

#### Acceptance Criteria

1. WHEN the engineering page loads, THE Frontend SHALL fetch tribes, clusters, and squads from the engineering API_Service_Module.
2. WHEN the capacity page loads, THE Frontend SHALL fetch capacity allocations from `GET /capacity/allocations`.
3. THE Frontend SHALL display capacity data with percentage allocations matching the backend response.

### Requirement 15: CORS Configuration

**User Story:** As a developer, I want CORS to be properly configured between the frontend and backend deployments, so that API calls succeed across origins in all environments.

#### Acceptance Criteria

1. THE Backend SHALL accept requests from the origin specified in the `CORS_ORIGIN` environment variable.
2. THE Backend SHALL allow the headers `Content-Type`, `Authorization`, and `X-Request-ID`.
3. THE Backend SHALL allow credentials (cookies) in cross-origin requests.
