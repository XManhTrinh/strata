# Implementation Plan: Scalable Permissions

## Overview

This plan implements a fully dynamic, data-driven authorization system replacing the existing static RBAC permission system. The implementation progresses from database schema through core engine, feature registry, admin API, guard integration, migration utility, and frontend admin panel. Each task builds incrementally on previous work, with checkpoints for validation.

## Tasks

- [x] 1. Database schema and Prisma models
  - [x] 1.1 Create Prisma schema additions for the new permission system
    - Add `PermissionScopeV2` enum (OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, GLOBAL)
    - Add `OrganizationUnitType` model with company relation, unique name constraint, and archive support
    - Add `OrganizationUnit` model with self-referencing parent/child, materialized path, manager, and indexes
    - Add `PositionV2` model with company scope, career level, and `canHaveDirectReports`
    - Add `ReportingRelationship` model with unique userId constraint and company/manager indexes
    - Add `UserCompanyMembership` model linking users to companies with position, org unit, and super admin flag
    - Add `RoleV2` model with company scope, isSystem flag, and archive support
    - Add `Feature` model with unique key and relation to permissions
    - Add `FeaturePermission` model with unique [featureId, key] constraint and deprecation support
    - Add `CompanyFeature` model with unique [companyId, featureId] enablement toggle
    - Add `RolePermissionAssignment` model with unique [roleId, featurePermissionId, scope] tuple
    - Add `RoleAssignmentV2` model linking membership to role with unique [membershipId, roleId]
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 4.1, 5.1, 6.1, 7.1, 7.2, 8.1, 9.1_

  - [x] 1.2 Generate and apply Prisma migration
    - Run `npx prisma migrate dev` to generate the SQL migration
    - Verify all indexes, constraints, and relations are correctly created
    - Ensure existing models remain untouched
    - _Requirements: 1.1, 12.2_

- [x] 2. Permission serializer and scope types
  - [x] 2.1 Implement permission serializer module
    - Create `apps/api/src/authorization/permission-serializer/permission-serializer.types.ts` with `ParsedPermission` interface
    - Create `apps/api/src/authorization/permission-serializer/permission-serializer.ts` with `serialize()` and `parse()` functions
    - Implement validation: exactly 3 colon-separated segments, lowercase alphanumeric + underscore only per segment, valid scope enum value
    - Create `InvalidPermissionFormatError` custom error class
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 2.2 Write property test: Permission String Round-Trip (Property 15)
    - **Property 15: Permission String Round-Trip**
    - Generate random valid (feature, permission, scope) tuples using fast-check arbitraries for lowercase alphanumeric+underscore strings and valid scope enum values
    - Assert `parse(serialize(tuple))` equals the original tuple
    - Assert `serialize(parse(serialize(tuple)))` equals `serialize(tuple)`
    - **Validates: Requirements 14.1, 14.2, 14.4, 14.5**

  - [ ]* 2.3 Write property test: Invalid Permission String Rejection (Property 16)
    - **Property 16: Invalid Permission String Rejection**
    - Generate random strings that do NOT contain exactly two colon characters
    - Assert `parse(s)` throws `InvalidPermissionFormatError`
    - **Validates: Requirements 14.3**

  - [x] 2.4 Implement scope resolver types and utilities
    - Create `apps/api/src/authorization/scope-resolver/scope-resolver.types.ts` with `PermissionScopeV2` enum, `SCOPE_LEVELS` ordering map, and `maxScope()` utility
    - Create `AccessRequest` and `AccessDecision` interfaces in `apps/api/src/authorization/authorization.types.ts`
    - _Requirements: 9.1, 9.8_

- [x] 3. Permission cache service
  - [x] 3.1 Implement permission cache with Redis
    - Create `apps/api/src/authorization/permission-cache/permission-cache.keys.ts` with key pattern constants and helper functions for all cache key patterns (permissions:v2, scope:branch, scope:reports, feature:enabled, auth:super_admin)
    - Create `apps/api/src/authorization/permission-cache/permission-cache.service.ts` implementing `getEffectivePermissions`, `setEffectivePermissions`, `invalidateUser`, `invalidateRole`, `invalidateCompany`
    - Implement TTLs: 5 min for user permissions, 10 min for branch scope, 5 min for direct reports
    - Handle Redis unavailability gracefully (return null to trigger DB fallback)
    - _Requirements: 10.3, 10.4, 10.7, 6.6, 15.4_

  - [ ]* 3.2 Write unit tests for permission cache service
    - Test cache hit/miss scenarios
    - Test invalidation for user, role, and company levels
    - Test graceful degradation when Redis is unavailable
    - _Requirements: 10.4, 10.7_

- [x] 4. Scope resolver service
  - [x] 4.1 Implement scope resolver core logic
    - Create `apps/api/src/authorization/scope-resolver/scope-resolver.service.ts`
    - Implement `resolve()` method handling all 6 scopes: OWN (userId match), DIRECT_REPORTS (reporting hierarchy lookup), ORGANIZATION_UNIT (same org unit), BRANCH (recursive descendant traversal), COMPANY (same company), GLOBAL (always true)
    - Implement `getUserIdsInScope()` returning all user IDs accessible for a given scope
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 4.2 Implement BRANCH scope with recursive CTE and caching
    - Create `apps/api/src/authorization/scope-resolver/scope-resolver.cache.ts` for hierarchy cache management
    - Implement `computeDescendants()` using PostgreSQL recursive CTE
    - Cache descendant sets in Redis with `scope:branch:{companyId}:{orgUnitId}` key pattern, 10-min TTL
    - Implement lazy rebuild on cache miss
    - _Requirements: 9.5, 15.1, 15.2, 15.4, 15.5_

  - [ ]* 4.3 Write property tests for scope resolution (Properties 4-8)
    - **Property 4: OWN scope** — generate random user pairs, assert OWN scope returns false when actor ≠ target owner
    - **Property 5: DIRECT_REPORTS scope** — generate random reporting trees, assert accessible set = {self} ∪ {direct reports}
    - **Property 6: ORGANIZATION_UNIT scope** — generate random org units with members, assert accessible = same-unit members only
    - **Property 7: BRANCH scope** — generate random org unit trees with users, assert accessible = users in unit + all descendant units
    - **Property 8: COMPANY scope** — generate two companies with random users, assert accessible = all same-company users only
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 5.5**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Feature registry service
  - [x] 6.1 Implement feature registry service and decorator
    - Create `apps/api/src/authorization/feature-registry/feature-registry.types.ts` with `FeatureDefinition` and `FeaturePermissionDefinition` interfaces
    - Create `apps/api/src/authorization/feature-registry/feature-registry.decorator.ts` implementing `@RegisterFeature()` class decorator using `Reflect.defineMetadata`
    - Create `apps/api/src/authorization/feature-registry/feature-registry.service.ts` implementing `register()`, `isValidAction()`, `isEnabledForCompany()`, `getAll()`, `getByKey()`
    - Upsert feature definitions to database on registration (idempotent)
    - Cache feature enabled status per company in Redis
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 12.1_

  - [x] 6.2 Implement feature registry bootstrap on application startup
    - Create `apps/api/src/authorization/feature-registry/feature-registry.bootstrap.ts`
    - Scan all loaded modules for `@RegisterFeature` metadata at `OnApplicationBootstrap` lifecycle hook
    - Call `register()` for each discovered feature definition
    - Handle new permissions added to existing features (upsert without deleting deprecated ones)
    - _Requirements: 7.1, 7.4, 7.6, 12.1_

  - [ ]* 6.3 Write unit tests for feature registry
    - Test feature registration and lookup
    - Test `isValidAction()` with valid and invalid feature/permission combinations
    - Test `isEnabledForCompany()` with enabled and disabled features
    - Test idempotent re-registration
    - _Requirements: 7.1, 7.4, 7.5_

- [x] 7. Authorization engine
  - [x] 7.1 Implement the 5-step authorization engine
    - Create `apps/api/src/authorization/authorization.engine.ts` implementing the `AuthorizationEngine` interface
    - Step 0: Super Admin bypass — check `isSuperAdmin` flag on `UserCompanyMembership`, return allow with COMPANY scope
    - Step 2: Check user has at least one role via `RoleAssignmentV2`
    - Step 3: Check any assigned role grants the required `feature:permission` via `RolePermissionAssignment` joined to `FeaturePermission` and `Feature`
    - Step 4: Validate the feature/permission exists in the registry AND feature is enabled for company
    - Step 5: Resolve scope — take broadest scope from all matching permissions, call `ScopeResolver.resolve()`
    - Implement `evaluateBatch()` for bulk checks
    - Use cache: check `PermissionCacheService` first, fall back to DB on miss
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8, 11.1, 6.5, 9.8_

  - [ ]* 7.2 Write property tests for authorization engine (Properties 9-14)
    - **Property 9: Multi-Role Union with Broadest Scope** — generate users with multiple roles granting same permission at different scopes, assert effective scope = max(scopes)
    - **Property 10: Sequential Evaluation Determinism** — generate requests failing at various steps, assert denial regardless of subsequent step outcomes
    - **Property 11: No Roles Deny All** — generate users with zero roles (non-super-admin), assert all requests denied at step 2
    - **Property 12: Super Admin Bypass** — generate super admin users, assert all valid feature requests allowed
    - **Property 13: Minimum One Super Admin Invariant** — generate companies with exactly 1 super admin, assert removal is rejected
    - **Property 14: Disabled Feature Denial** — generate disabled features for a company, assert all requests denied regardless of roles
    - **Validates: Requirements 6.5, 9.8, 10.1, 10.2, 10.5, 10.8, 11.1, 11.3, 11.5, 12.4**

  - [ ]* 7.3 Write property tests for tenant isolation (Properties 1-3)
    - **Property 1: Tenant Isolation** — generate two companies with random users/resources, assert cross-company access always denied
    - **Property 2: Circular Reference Detection — Org Tree** — generate random org trees, attempt to set descendants as parents, assert rejection and tree unchanged
    - **Property 3: Circular Reference Detection — Reporting Hierarchy** — generate random reporting DAGs, attempt cycle creation, assert rejection and hierarchy unchanged
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 3.5, 5.4**

- [x] 8. Authorization guard and decorator
  - [x] 8.1 Implement the PermissionGuard v2 and @RequireFeaturePermission decorator
    - Create `apps/api/src/authorization/authorization.decorator.ts` implementing `@RequireFeaturePermission(feature, permission)` using `SetMetadata`
    - Create `apps/api/src/authorization/authorization.guard.ts` as a NestJS `CanActivate` guard
    - Guard extracts feature/permission from metadata, builds `AccessRequest` from request context (user, company, target resource IDs), calls `AuthorizationEngine.evaluate()`
    - On denial: throw `ForbiddenException` with non-specific message, log detailed denial info (userId, companyId, feature, permission, step, targetResourceId)
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 8.2 Create the authorization NestJS module
    - Create `apps/api/src/authorization/authorization.module.ts` as a global module
    - Register `AuthorizationEngine`, `ScopeResolverService`, `PermissionCacheService`, `FeatureRegistryService`, `FeatureRegistryBootstrap`
    - Export the guard and decorator for use by other modules
    - Configure Redis connection for cache service
    - _Requirements: 12.1, 12.2_

  - [ ]* 8.3 Write unit tests for authorization guard
    - Test guard allows access when engine returns allowed
    - Test guard denies with 403 when engine returns denied
    - Test guard extracts correct metadata from decorator
    - Test logging of denial details
    - _Requirements: 10.1, 10.2, 10.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Admin API — Organization Unit Types
  - [x] 10.1 Implement org unit types CRUD controller and service
    - Create `apps/api/src/authorization/admin/org-unit-types.controller.ts` with endpoints: POST create, GET list (with archived filter), GET by id, PATCH update, POST archive, POST restore
    - Create DTOs: `CreateOrgUnitTypeDto`, `UpdateOrgUnitTypeDto` with Zod validation
    - Implement service with tenant-scoped queries (all queries filtered by companyId)
    - Validate unique name within company
    - Protect all endpoints with `@RequireFeaturePermission('authorization', 'manage_org_structure')`
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 2.7, 1.4, 12.6_

  - [ ]* 10.2 Write unit tests for org unit types admin endpoints
    - Test create, list, get, update, archive, restore operations
    - Test unique name validation
    - Test tenant isolation (cannot access other company's types)
    - _Requirements: 2.1, 2.7, 1.4_

- [x] 11. Admin API — Organization Units
  - [x] 11.1 Implement org units CRUD controller and service
    - Create `apps/api/src/authorization/admin/org-units.controller.ts` with endpoints: POST create, GET list (flat with parentId filter), GET tree, GET by id, PATCH update, POST move, POST archive, POST assign members, DELETE remove member
    - Implement tree traversal for GET tree endpoint using materialized path
    - Implement move operation with circular reference detection (check if target parent is a descendant of the unit being moved)
    - On move: update materialized path for unit and all descendants, invalidate `scope:branch` caches for affected company
    - Validate org unit type exists and is not archived when creating
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.6_

  - [ ]* 11.2 Write unit tests for org units admin endpoints
    - Test CRUD operations
    - Test circular reference rejection on move
    - Test materialized path update on move
    - Test tree endpoint returns correct hierarchy
    - Test scope cache invalidation on restructure
    - _Requirements: 3.4, 3.5, 15.3_

- [x] 12. Admin API — Positions
  - [x] 12.1 Implement positions CRUD controller and service
    - Create `apps/api/src/authorization/admin/positions.controller.ts` with endpoints: POST create, GET list, PATCH update, POST archive, DELETE (if unused)
    - Create DTOs: `CreatePositionDto`, `UpdatePositionDto`
    - Validate unique name within company
    - Prevent deletion if position is assigned to any user
    - _Requirements: 4.1, 4.3, 4.5, 4.6, 12.6_

  - [ ]* 12.2 Write unit tests for positions admin endpoints
    - Test CRUD operations
    - Test deletion prevention when assigned
    - Test unique name validation
    - _Requirements: 4.1, 4.6_

- [x] 13. Admin API — Roles and permissions
  - [x] 13.1 Implement roles CRUD controller and service
    - Create `apps/api/src/authorization/admin/roles.controller.ts` with endpoints: POST create, GET list, GET by id (with permissions), PATCH update, POST duplicate, POST archive, DELETE (if unassigned)
    - Implement duplicate: copy all `RolePermissionAssignment` records to new role with suffixed name
    - Prevent deletion if role is assigned to any user via `RoleAssignmentV2`
    - On permission modification: trigger cache invalidation for all users assigned the role (within 5 seconds)
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 12.6_

  - [x] 13.2 Implement permission assignment endpoints
    - Add endpoints: POST add permission(s), DELETE remove permission, POST bulk add/remove
    - Validate feature and feature permission exist in registry before assignment
    - Prevent duplicate (role, featurePermission, scope) tuples
    - On any change: invalidate `permissions:v2:{companyId}:{userId}` for all affected users
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 13.3 Implement role assignment endpoints for users
    - Add endpoints: POST assign role to user, GET user's roles, DELETE remove role, GET effective permissions
    - For effective permissions: resolve all role assignments → union permissions → compute broadest scope per feature:permission
    - Enforce minimum one super admin: reject removal of last super admin's admin role
    - On assignment change: invalidate user's permission cache
    - _Requirements: 6.4, 6.5, 11.3, 11.5_

  - [ ]* 13.4 Write unit tests for roles and permission assignment
    - Test role CRUD, duplicate, archive, delete
    - Test permission add/remove/bulk operations
    - Test duplicate permission prevention
    - Test role assignment and effective permission resolution
    - Test last super admin protection
    - Test cache invalidation on permission/role changes
    - _Requirements: 6.1, 6.6, 8.5, 11.3_

- [x] 14. Admin API — Features and reporting hierarchy
  - [x] 14.1 Implement features controller
    - Create `apps/api/src/authorization/admin/features.controller.ts` with endpoints: GET list all features (platform-wide), GET feature by key, GET company features with enabled status, PATCH enable/disable feature for company
    - On disable: invalidate `feature:enabled:{companyId}` cache
    - _Requirements: 7.7, 12.4, 12.6_

  - [x] 14.2 Implement reporting hierarchy controller
    - Create `apps/api/src/authorization/admin/reporting.controller.ts` with endpoints: POST set manager, GET user's manager, GET direct reports, DELETE remove manager
    - Implement circular reference detection: before setting A's manager to B, verify B is not in A's report chain (A → ... → B would create a cycle)
    - On change: invalidate `scope:reports:{companyId}:{managerId}` and `scope:reports:{companyId}:{oldManagerId}`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 12.6_

  - [ ]* 14.3 Write unit tests for features and reporting endpoints
    - Test feature listing and enable/disable
    - Test reporting hierarchy CRUD
    - Test circular reference rejection in reporting
    - Test cache invalidation on manager change
    - _Requirements: 5.4, 5.7, 7.7, 12.4_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Replace existing PermissionGuard with v2
  - [x] 16.1 Integrate authorization guard into existing modules
    - Replace existing `PermissionGuard` references with the new `AuthorizationGuard` in all feature modules
    - Update existing `@Permissions()` decorators to use `@RequireFeaturePermission(feature, permission)` syntax
    - Register existing features with `@RegisterFeature()` decorator on their modules (leave, employees, budgeting, capacity, engineering, etc.)
    - Ensure `AuthorizationModule` is imported globally in `AppModule`
    - _Requirements: 7.1, 12.1, 12.2_

  - [x] 16.2 Implement backward-compatible permission endpoints
    - Create thin wrapper endpoints at existing `/api/permissions/*` paths
    - Translate old scope names: SELF→OWN, TEAM→DIRECT_REPORTS, ORGANIZATION→COMPANY
    - Proxy requests to the new authorization engine
    - Log usage of deprecated endpoints for sunset tracking
    - _Requirements: 13.8_

  - [ ]* 16.3 Write integration tests for guard replacement
    - Test that existing API endpoints still work with the new guard
    - Test backward-compatible endpoints translate scopes correctly
    - Test feature self-registration at startup
    - _Requirements: 12.1, 13.8_

- [x] 17. Migration utility
  - [x] 17.1 Implement migration service
    - Create `apps/api/src/authorization/migration/migration.service.ts`
    - Implement step-by-step migration logic:
      1. Create `Company` records from existing `Organization`
      2. Create `OrganizationUnitType` records for Department, Tribe, Cluster, Squad
      3. Convert `Department` hierarchy → `OrganizationUnit` with materialized paths
      4. Convert Tribe/Cluster/Squad → `OrganizationUnit` with nesting
      5. Create `UserCompanyMembership` records
      6. Migrate `Position` → `PositionV2` (detach from department, scope to company)
      7. Register features from existing permission `resource` values
      8. Create `FeaturePermission` records from existing `action` values per feature
      9. Migrate `Role` → `RoleV2` preserving names/descriptions
      10. Migrate `RolePermission` → `RolePermissionAssignment` with scope mapping (SELF→OWN, TEAM→DIRECT_REPORTS, ORGANIZATION→COMPANY)
      11. Migrate `RoleAssignment` → `RoleAssignmentV2` linked to membership
    - Generate migration report with counts, unmapped items, and conflicts
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 17.2 Implement migration CLI command
    - Create `apps/api/src/authorization/migration/migration.command.ts` as a NestJS standalone CLI command
    - Accept flags: `--dry-run` (report only, no writes), `--company-id` (migrate single company), `--all` (migrate all)
    - Run migration within a database transaction (rollback on failure)
    - Output migration report to stdout and optionally to a JSON file
    - _Requirements: 13.7_

  - [ ]* 17.3 Write unit tests for migration mapping logic
    - Test scope mapping: SELF→OWN, TEAM→DIRECT_REPORTS, ORGANIZATION→COMPANY
    - Test permission pair parsing: `action:resource` → `feature:permission`
    - Test department hierarchy conversion preserves parent/child relationships
    - Test migration report generation
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Frontend admin panel — Organization structure pages
  - [x] 19.1 Implement org unit types management page
    - Create page at appropriate route in the Next.js frontend
    - Build CRUD interface: list with create/edit/archive actions
    - Include form fields: name, description, icon picker, color picker, display order
    - Use existing UI component library and data fetching patterns
    - _Requirements: 2.1, 2.6_

  - [x] 19.2 Implement org units tree management page
    - Create page displaying organization hierarchy as an interactive tree
    - Support create, edit, move (drag-and-drop), and archive operations
    - Show unit details panel with member list and manager assignment
    - Implement member assignment and removal
    - _Requirements: 3.1, 3.6, 3.8_

- [x] 20. Frontend admin panel — Roles and permissions pages
  - [x] 20.1 Implement roles management page
    - Create page with role list, create, edit, duplicate, archive, and delete actions
    - Build permission assignment interface: grouped by feature, with scope selection per permission
    - Support bulk permission add/remove
    - Show users assigned to each role
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 8.3, 8.6_

  - [x] 20.2 Implement user role assignment page
    - Create user detail section or page for managing role assignments
    - Show current roles and effective permissions (resolved with broadest scope)
    - Support adding/removing role assignments
    - Display permissions grouped by feature with effective scope
    - _Requirements: 6.4, 6.5_

- [x] 21. Frontend admin panel — Positions, features, and reporting
  - [x] 21.1 Implement positions management page
    - Create page with position list, create, edit, archive, delete actions
    - Include career level and "can have direct reports" fields
    - _Requirements: 4.1, 4.6_

  - [x] 21.2 Implement features configuration page
    - Create page listing all registered features with enable/disable toggle per company
    - Show feature permissions for reference (read-only, defined by code)
    - _Requirements: 7.7, 12.4_

  - [x] 21.3 Implement reporting hierarchy management page
    - Create page or section for viewing/editing manager assignments
    - Display reporting tree visualization
    - Support set/change/remove manager operations
    - Show direct reports for selected user
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 16 universal correctness properties defined in the design
- The implementation uses TypeScript with NestJS (backend) and Next.js (frontend), Prisma ORM, Redis for caching, and fast-check for property-based testing
- All admin endpoints are protected by the new authorization guard requiring `authorization:manage_*` permissions
- The migration utility should be run per-company with dry-run capability before committing changes
