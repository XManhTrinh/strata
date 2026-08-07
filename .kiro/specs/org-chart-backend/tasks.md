# Implementation Plan: Org Chart Backend

## Overview

This plan connects the existing org chart frontend to real backend endpoints. We create an `OrgChartModule` in the NestJS API that assembles the reporting hierarchy from Prisma queries, caches the result in Redis, and serves it as nested JSON. A second endpoint returns employees grouped by organizational unit. The frontend replaces its mock data layer with TanStack Query hooks consuming these endpoints.

## Tasks

- [x] 1. Create OrgChartModule with types and service skeleton
  - [x] 1.1 Create the org-chart directory and module file at `apps/api/src/org-chart/org-chart.module.ts`
    - Register `OrgChartController` and `OrgChartService` as providers
    - Import PrismaClient and Redis from existing providers
    - _Requirements: 1.1, 1.6_
  - [x] 1.2 Define TypeScript interfaces for internal and response types
    - Create `apps/api/src/org-chart/org-chart.types.ts`
    - Define `OrgTreeNode`, `FlatEmployee`, `FlatRelationship`, `UnitViewResponse`, `UnitEmployee`, `UnitAncestor` interfaces
    - _Requirements: 1.2, 3.2, 3.3, 3.5_
  - [x] 1.3 Create `OrgChartService` at `apps/api/src/org-chart/org-chart.service.ts`
    - Inject `PrismaClient` and `Redis`
    - Stub methods: `getTree`, `getUnitView`, `invalidateTree`, `buildTree`
    - _Requirements: 1.1, 1.4, 2.1_
  - [x] 1.4 Register `OrgChartModule` in `apps/api/src/app.module.ts`
    - Add import to the AppModule imports array
    - _Requirements: 1.1_

- [x] 2. Implement tree construction logic (pure function)
  - [x] 2.1 Implement the `buildTree` method in `OrgChartService`
    - Accept `FlatEmployee[]` and `FlatRelationship[]` as inputs
    - Build a `Map<userId, OrgTreeNode>` from employees (all with empty directReports)
    - Iterate relationships to push child nodes into parent's directReports
    - Identify root nodes (employees with no manager entry in relationships)
    - Return `OrgTreeNode[]` (roots with nested children)
    - Time complexity: O(n)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 2.2 Write property test: Tree uniqueness invariant
    - **Property 1: Tree uniqueness invariant**
    - Use fast-check to generate random employee sets and relationship subsets
    - Assert every employee appears exactly once across all tree nodes
    - **Validates: Requirements 7.1**
  - [ ]* 2.3 Write property test: Tree construction round-trip
    - **Property 2: Tree construction round-trip**
    - Use fast-check to generate random valid relationships
    - Build tree, flatten back to (userId, managerId) pairs, compare to original set
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 3. Implement tree endpoint with caching
  - [x] 3.1 Implement `getTree` method in `OrgChartService`
    - Check Redis cache at key `org-chart:tree:{companyId}` first
    - On cache hit: parse JSON and return
    - On cache miss: run three parallel Prisma queries (`userCompanyMembership.findMany`, `reportingRelationship.findMany`, `user.findMany` with person include)
    - Map query results to `FlatEmployee[]` and `FlatRelationship[]`
    - Call `buildTree` to assemble the hierarchy
    - Store result in Redis with 300s TTL
    - Handle Redis failures gracefully (skip cache on error, log warning)
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.5_
  - [x] 3.2 Create `OrgChartController` at `apps/api/src/org-chart/org-chart.controller.ts`
    - Route: `@Controller('api/v2/companies/:companyId/org-chart')`
    - Apply `@UseGuards(AuthorizationGuard)` for auth
    - Implement `GET /` handler calling `service.getTree(companyId)`
    - Return 404 if company has no members (validate companyId)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_
  - [ ]* 3.3 Write unit tests for `getTree` cache behavior
    - Test: returns cached value when Redis has data
    - Test: builds tree on cache miss and stores result in Redis
    - Test: handles Redis failure gracefully (falls back to DB)
    - Test: returns 404 for non-existent company
    - _Requirements: 2.1, 2.2, 1.5_

- [x] 4. Implement unit view endpoint
  - [x] 4.1 Implement `getUnitView` method in `OrgChartService`
    - Query `OrganizationUnit` by id within company, return 404 if not found
    - Query employees whose `UserCompanyMembership.orgUnitId` matches the unit
    - Walk the unit's `parentId` chain to build the ancestor array (root → unit)
    - Return `UnitViewResponse` with unit details, parentChain, and employees
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.2 Add unit endpoint to `OrgChartController`
    - Implement `GET /unit/:unitId` handler calling `service.getUnitView(companyId, unitId)`
    - Return 404 if unitId does not exist within the company
    - _Requirements: 3.1, 3.4, 3.6_
  - [ ]* 4.3 Write property test: Unit member retrieval correctness
    - **Property 3: Unit member retrieval correctness**
    - Generate random unit memberships, call `getUnitView` logic, verify result matches input membership set
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 4.4 Write property test: Ancestor chain correctness
    - **Property 4: Ancestor chain correctness**
    - Generate random unit hierarchy, verify parentChain equals walked parentId chain
    - **Validates: Requirements 3.3**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement cache invalidation integration
  - [x] 6.1 Implement `invalidateTree` method in `OrgChartService`
    - Delete Redis key `org-chart:tree:{companyId}`
    - Handle Redis failures gracefully (log warning, don't throw)
    - _Requirements: 2.3, 2.4_
  - [x] 6.2 Add org chart cache invalidation to `ReportingService`
    - In `apps/api/src/authorization/admin/reporting.service.ts`
    - After `setManager` persists, call `redis.del(\`org-chart:tree:${companyId}\`)`
    - After `removeManager` persists, call `redis.del(\`org-chart:tree:${companyId}\`)`
    - _Requirements: 2.3_
  - [ ]* 6.3 Write unit tests for cache invalidation
    - Test: `invalidateTree` deletes the correct Redis key
    - Test: `setManager` invalidates org chart cache
    - Test: `removeManager` invalidates org chart cache
    - _Requirements: 2.3, 2.4_

- [ ] 7. Create frontend service hooks
  - [x] 7.1 Create `apps/web/src/services/org-chart.service.ts`
    - Define `OrgTreeNode`, `UnitEmployee`, `UnitAncestor`, `UnitViewResponse` interfaces
    - Implement `useOrgChart(companyId)` hook using `useQuery`
      - queryKey: `["org-chart", companyId]`
      - queryFn: call `apiClient<OrgTreeNode[]>(\`/api/v2/companies/${companyId}/org-chart\`)`
      - enabled: `!!companyId`
      - staleTime: 30000 (30 seconds)
    - Implement `useOrgChartByUnit(companyId, unitId)` hook using `useQuery`
      - queryKey: `["org-chart", "unit", companyId, unitId]`
      - queryFn: call `apiClient<UnitViewResponse>(\`/api/v2/companies/${companyId}/org-chart/unit/${unitId}\`)`
      - enabled: `!!companyId && !!unitId`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_
  - [x] 7.2 Export hooks from `apps/web/src/services/index.ts`
    - Add re-export for `org-chart.service.ts`
    - _Requirements: 4.1, 5.1_

- [ ] 8. Integrate frontend hooks with org chart page
  - [x] 8.1 Replace `MockPersonRepository` usage with `useOrgChart` hook
    - In the org chart page component, replace `useOrgTree(repository)` with `useOrgChart(companyId)`
    - Map `OrgTreeNode[]` response to the shape expected by existing `OrgFlow`/`ReactFlow` tree rendering components
    - _Requirements: 6.1, 6.2, 6.6_
  - [x] 8.2 Add loading and error states to the org chart page
    - Show loading indicator while data is fetching
    - Display error message if API returns an error
    - _Requirements: 6.7, 6.8_
  - [x] 8.3 Add "Teams" view mode with unit selector
    - Add a view mode toggle (Reporting / Teams)
    - In Teams mode, render a unit selector using existing org units data
    - When a unit is selected, call `useOrgChartByUnit(companyId, unitId)` and display the unit employees
    - Show the ancestor breadcrumb from `parentChain`
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The `buildTree` pure function is the primary target for property-based testing with fast-check
- Redis failures are handled gracefully throughout — cache is optional, never blocks the response
