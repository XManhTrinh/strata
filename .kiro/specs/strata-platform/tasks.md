# Implementation Plan: Strata Platform

## Overview

This plan implements the Strata enterprise workforce management platform as a TypeScript monorepo (pnpm + Turborepo) with a Next.js frontend, NestJS backend, and BullMQ worker service. Tasks proceed in logical dependency order: project scaffolding → shared packages → backend domain modules → frontend shell and pages → integration and wiring.

## Tasks

- [x] 1. Project scaffolding and monorepo setup
  - [x] 1.1 Initialize monorepo with pnpm workspace and Turborepo
    - Create root `package.json`, `pnpm-workspace.yaml`, and `turbo.json`
    - Configure workspace packages: `apps/web`, `apps/api`, `apps/worker`, `packages/ui`, `packages/database`, `packages/auth`, `packages/validation`, `packages/shared-types`, `packages/config`, `packages/utils`
    - Add shared dev dependencies (TypeScript, ESLint, Prettier)
    - Configure Turborepo pipeline for build, dev, lint, and test tasks
    - _Requirements: 16.5, 18.1_

  - [x] 1.2 Set up the NestJS API application
    - Scaffold `apps/api` with NestJS CLI structure
    - Configure `tsconfig.json`, environment variables, and module resolution for workspace packages
    - Add dependencies: `@nestjs/core`, `@nestjs/platform-express`, `zod`, `bcrypt`, `jsonwebtoken`
    - Set up global exception filter, validation pipe, and request ID middleware
    - _Requirements: 16.5, 18.1_

  - [x] 1.3 Set up the Next.js web application
    - Scaffold `apps/web` with Next.js 14 App Router
    - Install Tailwind CSS, Material UI, Framer Motion, and xyflow/react
    - Configure `tailwind.config.ts` with the design system color tokens, spacing, and radius tokens
    - Set up `providers.tsx` with ThemeProvider, React Query provider, and auth context
    - _Requirements: 15.1, 15.2_

  - [x] 1.4 Set up the Worker service
    - Create `apps/worker` with BullMQ processor scaffold
    - Configure queue connections (reports, notifications, imports) with retry and backoff settings per the design
    - Set up graceful shutdown and health check
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 1.5 Set up the shared database package with Prisma
    - Create `packages/database` with full Prisma schema (all models, enums, relations from the design document)
    - Configure PostgreSQL connection string via environment variable
    - Generate Prisma client and export from package
    - Create initial migration
    - _Requirements: 1.1, 2.1, 3.1, 3.4_

  - [x] 1.6 Set up shared validation package with Zod schemas
    - Create `packages/validation` with Zod schemas for all domain entities: Person, Employee, Department, Position, Tribe, Cluster, Squad, TeamMembership, CapacityAllocation, Budget, LeaveRequest, User, Notification
    - Include create/update DTOs for each entity
    - Configure strict mode (no unknown field passthrough)
    - Export schemas and inferred TypeScript types
    - _Requirements: 18.1, 18.3, 18.4_

  - [ ]* 1.7 Write property tests for Zod schema round-trip consistency
    - **Property 1: Domain Object Serialization Round-Trip**
    - Create custom fast-check arbitraries for all domain objects in `packages/validation/__tests__/arbitraries/`
    - Verify serialize-then-parse produces equivalent objects for every entity schema
    - **Validates: Requirements 18.5**

  - [ ]* 1.8 Write property tests for schema validation error reporting
    - **Property 2: Schema Validation Rejects Invalid Payloads with Field Errors**
    - Generate invalid payloads (missing fields, wrong types, unknown fields) and verify 400-style field-level errors
    - **Validates: Requirements 18.1, 18.2, 18.4**

  - [x] 1.9 Set up shared-types, auth, config, and utils packages
    - Create `packages/shared-types` with TypeScript type definitions and API response interfaces
    - Create `packages/auth` with JWT sign/verify helpers and bcrypt hash/compare utilities
    - Create `packages/config` with environment variable loading and validation
    - Create `packages/utils` with common utilities (date formatting, pagination helpers, slug generation)
    - _Requirements: 13.1, 13.2_

- [x] 2. Checkpoint - Ensure monorepo builds and shared packages compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Authentication and permissions module
  - [x] 3.1 Implement Auth module (login, refresh, logout)
    - Create `AuthController` with POST `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints
    - Implement `AuthService` with credential validation, JWT issuance (15 min access, 7 day refresh), refresh token rotation, and account lockout logic (5 attempts / 15 min → 30 min lock)
    - Implement `AuthGuard` as global JWT validation guard
    - Store refresh tokens in database and invalidate on password change
    - Use Redis for rate limiting login attempts
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 3.2 Write property tests for authentication
    - **Property 21: Password Hash Verification Round-Trip**
    - **Property 22: Token Expiration Bounds**
    - **Property 23: Invalid Token Rejection**
    - **Property 24: Account Lockout Threshold**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**

  - [x] 3.3 Implement Permissions module (roles, permissions, scoped access)
    - Create `PermissionsController` with Role CRUD and RoleAssignment management endpoints
    - Implement `PermissionsDomain` with scope resolution logic (SELF, TEAM, ORGANIZATION)
    - Implement `PermissionGuard` decorator that checks Permission + Scope for each endpoint
    - Cache permission evaluations in Redis with 5-minute TTL; invalidate when roles are modified
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.4 Write property tests for permission evaluation
    - **Property 17: Permission Scope Evaluation**
    - Generate arbitrary user/role/permission/scope combinations and verify access decisions
    - **Validates: Requirements 9.2, 9.3**

- [x] 4. Core domain modules — People and Employees
  - [x] 4.1 Implement People module
    - Create `PeopleController` with full CRUD endpoints for Person records
    - Implement `PeopleDomain` with validation rules (required fields, email format, date of birth constraints)
    - Implement `PeopleRepository` with Prisma queries
    - Implement `PeopleService` orchestrating validation, persistence, and audit record creation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Implement Employees module
    - Create `EmployeesController` with CRUD, status transition, and query endpoints
    - Implement `EmployeesDomain` with UIN generation (unique per org, immutable), employment status state machine (ACTIVE, ON_LEAVE, TERMINATED, SUSPENDED), and termination soft-delete logic
    - Implement `EmployeesRepository` with filtered queries (department, position, status, date range)
    - Implement `EmployeesService` orchestrating validation, UIN assignment, status transitions, and audit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.3 Write property tests for Employee domain logic
    - **Property 3: UIN Uniqueness and Immutability**
    - **Property 4: Employee Creation Requires Valid Person**
    - **Property 5: Employee Filter Correctness**
    - **Property 6: Employee Termination Soft-Delete**
    - **Validates: Requirements 2.2, 2.3, 2.5, 2.6**

  - [x] 4.4 Implement Audit module
    - Create `AuditController` with read-only query endpoints (paginated, max 100 per page)
    - Implement `AuditInterceptor` as NestJS interceptor that captures entity changes on every create/update/delete operation
    - Implement `AuditService` with record creation and paginated querying by entity, date range, or user
    - Store diff of changed fields in JSON format
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 4.5 Write property tests for audit system
    - **Property 18: Audit Record on Every Mutation**
    - **Property 19: Audit Query Pagination Bound**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 5. Checkpoint - Ensure auth, people, employees, and audit modules pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Organization and engineering structure modules
  - [x] 6.1 Implement Organizations module (Departments and Positions)
    - Create `OrganizationsController` with Department and Position CRUD endpoints
    - Implement `OrganizationsDomain` with hierarchy validation (supports 10+ levels depth), circular reference detection, and deletion constraints (reject if department has active employees)
    - Implement `OrganizationsRepository` with recursive hierarchy queries and department tree caching (Redis, 10 min TTL)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property tests for organization hierarchy
    - **Property 7: Department Hierarchy Depth**
    - **Property 8: Department Circular Reference Detection**
    - **Property 9: Department Deletion Constraint**
    - **Validates: Requirements 3.2, 3.3, 3.5**

  - [x] 6.3 Implement Engineering module (Tribes, Clusters, Squads, Team Membership)
    - Create `EngineeringController` with Tribe/Cluster/Squad CRUD and TeamMembership management endpoints
    - Implement `EngineeringDomain` with strict hierarchy enforcement (Tribe → Cluster → Squad), capacity allocation validation on team membership creation
    - Implement `EngineeringRepository` with hierarchy queries
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.4 Write property tests for engineering hierarchy
    - **Property 10: Engineering Hierarchy Enforcement**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.5 Implement Capacity module
    - Create `CapacityController` with allocation CRUD and capacity overview query endpoints
    - Implement `CapacityDomain` with percentage validation (1-100 inclusive), total capacity constraint enforcement (sum ≤ 100% per employee)
    - Implement capacity summary caching in Redis (2 min TTL) with invalidation on allocation changes
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 6.6 Write property tests for capacity allocation
    - **Property 11: Capacity Allocation Bounds**
    - **Property 12: Total Capacity Constraint**
    - **Validates: Requirements 5.4, 5.5, 6.1, 6.2**

- [x] 7. Budget, Leave, Notifications, and Reports modules
  - [x] 7.1 Implement Budgeting module
    - Create `BudgetingController` with Budget CRUD and variance query endpoints
    - Implement `BudgetingDomain` with non-negative amount validation and actual spend calculation (sum of compensation for active employees in department during fiscal period)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write property tests for budgeting
    - **Property 13: Budget Non-Negative Amount**
    - **Property 14: Budget Actual Spend Calculation**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 7.3 Implement Leave Management module
    - Create `LeaveController` with leave request CRUD and status transition endpoints
    - Implement `LeaveDomain` with date validation, overlap detection against approved leave, and status machine (PENDING→APPROVED, PENDING→REJECTED, APPROVED→CANCELLED only)
    - Implement `LeaveService` with notification triggering on submission and manager notification
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.4 Write property tests for leave management
    - **Property 15: Leave Request Overlap Detection**
    - **Property 16: Leave Status Machine Validity**
    - **Validates: Requirements 8.2, 8.4, 8.5**

  - [x] 7.5 Implement Notifications module
    - Create `NotificationsController` with query (by read status, type, date range), mark-as-read, and listing endpoints
    - Implement `NotificationsService` with notification creation and delivery enqueueing as background job
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ]* 7.6 Write property test for notification filtering
    - **Property 20: Notification Filter Correctness**
    - **Validates: Requirements 12.5**

  - [x] 7.7 Implement Reports module and Worker processors
    - Create `ReportsController` with report request, listing, and download endpoints
    - Implement `ReportsService` with job enqueueing to the `reports` queue
    - Implement `ReportProcessor` in the Worker service for headcount, capacity, budget, and leave report generation
    - Implement `NotificationProcessor` in the Worker service for notification delivery
    - Implement `ImportProcessor` in the Worker service for bulk data imports
    - Configure retry (3 attempts) with exponential backoff per queue
    - Create notification for admins on job failure after all retries
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 17.1, 17.2, 17.3_

- [x] 8. Search module and caching layer
  - [x] 8.1 Implement Search module
    - Create `SearchController` with full-text search endpoint
    - Implement `SearchService` with query construction across Person name, Employee position title, Department name, and Squad name
    - Support combining search with filters (department, status, role, date range)
    - Ensure results return within 500ms for up to 10,000 records
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ]* 8.2 Write property test for search correctness
    - **Property 25: Search and Filter Correctness**
    - **Validates: Requirements 14.1, 14.3**

  - [x] 8.3 Implement Redis caching layer
    - Add caching to permission evaluations (5 min TTL)
    - Add caching to department tree queries (10 min TTL)
    - Add caching to capacity summaries (2 min TTL)
    - Implement cache invalidation on relevant data mutations
    - _Requirements: 16.3, 16.4_

  - [ ]* 8.4 Write property test for cache invalidation
    - **Property 26: Cache Invalidation Freshness**
    - **Validates: Requirements 16.4**

- [x] 9. Checkpoint - Ensure all backend modules pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend shell, layout, and navigation
  - [x] 10.1 Implement AppShell layout with sidebar and header
    - Create `(dashboard)/layout.tsx` with collapsible sidebar (icon-only and expanded modes), sticky header with breadcrumbs, and content area
    - Implement `Sidebar` component with section groups (Overview, People, Organization, Engineering, Finance, System), active state indicators, collapse animation (Framer Motion)
    - Implement `Header` component with breadcrumbs, notification badge, and user menu
    - Persist sidebar collapse state in localStorage
    - _Requirements: 15.4, 15.5_

  - [x] 10.2 Implement theme system and accessibility foundations
    - Implement `ThemeProvider` with light/dark switching and system preference detection
    - Define CSS custom properties for both themes using the design system color tokens
    - Persist selected theme in localStorage
    - Implement reduced motion support (disable Framer Motion animations when `prefers-reduced-motion` is set)
    - Add skip-to-content link, focus trap utilities, and aria-live region for route announcements
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 10.3 Implement CommandPalette and mobile navigation
    - Create CommandPalette component triggered by ⌘K/Ctrl+K with fuzzy search across entities and quick actions
    - Implement keyboard navigation (arrow keys, Enter)
    - Create MobileNav bottom tab bar for mobile breakpoints
    - _Requirements: 15.4_

  - [x] 10.4 Implement shared UI components (packages/ui)
    - Create `DataTable` with pagination, sorting, filtering, column resizing, row selection, skeleton loading rows, and empty state
    - Create `SearchInput` with 300ms debounce, typeahead, and highlighted matches
    - Create `FormBuilder` driven by Zod schemas with inline validation and animated error messages
    - Create `StatCard`, `Badge`, `Avatar`, `ProgressBar`, `Toast`, `Skeleton`, `EmptyState`, `ConfirmDialog`, `Drawer` components per the design system
    - Ensure all components meet WCAG 2.2 AA standards
    - _Requirements: 1.5, 14.4, 14.5, 15.3, 15.4, 15.5_

- [x] 11. Frontend domain pages
  - [x] 11.1 Implement Dashboard page
    - Create dashboard with stat cards (headcount, capacity utilization, pending leave, budget variance)
    - Add recent activity feed and quick action buttons
    - Implement skeleton loading state matching page layout
    - _Requirements: 4.5, 6.4, 7.4_

  - [x] 11.2 Implement People and Employees pages
    - Create PeoplePage with DataTable, search/filter, inline quick-edit, and slide-over detail panel
    - Create EmployeesPage with status badges, capacity indicators, and bulk actions
    - Implement Zod-schema-driven forms for create/edit with client-side validation using shared schemas
    - _Requirements: 1.5, 2.5, 14.4, 18.3_

  - [x] 11.3 Implement Org Chart page
    - Create OrgChartPage with xyflow/react interactive visualization
    - Implement custom node components for Departments and Employees
    - Add zoom, pan, minimap, and keyboard navigation
    - Implement detail drawer on node click
    - Use virtualization for large hierarchies (1000+ nodes)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 11.4 Implement Engineering and Capacity pages
    - Create EngineeringPage with Tribe/Cluster/Squad hierarchy tree view
    - Create CapacityPage with stacked progress bars, heatmap, and allocation editor drawer
    - Show per-employee total allocation percentage with color-coded thresholds (green < 70%, yellow < 90%, red ≥ 90%)
    - Real-time update of capacity values without full page reload
    - _Requirements: 5.3, 6.4, 6.5_

  - [x] 11.5 Implement Budget and Leave pages
    - Create BudgetPage with budget vs. actual comparison, sparklines, variance indicators, and drill-down by department
    - Display visual warning when actual spend exceeds budget
    - Create LeavePage with leave request form, calendar visualization, approval workflow cards, and team absence timeline
    - _Requirements: 7.4, 7.5, 8.1, 8.3_

  - [x] 11.6 Implement Reports and Audit pages
    - Create ReportsPage with report listing cards showing status, type, generation date, progress indicators, and download actions
    - Create AuditPage with searchable/filterable audit log table, timeline view, diff viewer modal, and entity-linked navigation
    - _Requirements: 10.5, 17.4, 17.5_

  - [x] 11.7 Implement Notifications UI
    - Create notification badge with animated unread count in header
    - Implement dropdown notification panel with mark-as-read functionality
    - Update badge count within 1 second without page reload
    - _Requirements: 12.3, 12.4_

- [x] 12. Frontend authentication flow
  - [x] 12.1 Implement login page and auth state management
    - Create `(auth)/login/page.tsx` with email/password form and inline validation
    - Implement auth context/store with JWT token management (access + refresh)
    - Handle token refresh on 401 responses via API client interceptor
    - Implement account lockout feedback messaging
    - Redirect to login on auth errors with return URL preservation
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 13. Checkpoint - Ensure frontend builds and renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration, API client, and end-to-end wiring
  - [x] 14.1 Implement frontend API client with React Query
    - Create typed API client in `apps/web/src/lib/` with REST calls to all backend endpoints
    - Set up React Query hooks for all domain modules (people, employees, orgs, engineering, capacity, budgets, leave, reports, audit, notifications, search)
    - Implement optimistic updates for mutations with rollback on error
    - Implement stale-while-revalidate for background data freshness
    - Configure automatic retry for 5xx errors with exponential backoff
    - _Requirements: 6.5, 12.4, 16.1_

  - [x] 14.2 Wire frontend pages to backend API
    - Connect all domain pages to their respective React Query hooks
    - Implement loading states (skeleton → content transitions)
    - Implement error states (toast for network errors, inline for validation, error boundary for 500s)
    - Wire search input to search API with 300ms debounce
    - _Requirements: 14.4, 14.5, 16.1_

  - [x] 14.3 Implement responsive design and final UI polish
    - Apply responsive breakpoints (mobile < 640px, tablet 640-1024px, desktop 1024-1440px, wide > 1440px)
    - DataTable collapses to card list on mobile
    - Drawers become full-screen modals on mobile
    - Max-width container (1400px) centered on wide screens
    - _Requirements: 15.3, 15.4_

- [x] 15. Final checkpoint - Ensure full platform builds and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- Property tests validate the 26 universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The frontend uses shared Zod schemas from `packages/validation` for client-side validation, ensuring consistency with the backend
