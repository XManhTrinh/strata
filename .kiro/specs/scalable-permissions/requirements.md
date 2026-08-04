# Requirements Document

## Introduction

This document specifies the requirements for a Dynamic Organization Structure and Authorization System that replaces the existing basic permission system in the Strata platform. The new system is fully configurable and data-driven — no hardcoded organizational structures, job titles, departments, teams, or roles exist beyond a bootstrap Company Super Admin. Each company defines its own organizational model, positions, roles, features, and permission scopes entirely through the Admin Panel. The platform supports companies of all sizes and organizational styles (Departments, Teams, Clusters, Tribes, Squads, Chapters, Guilds, Regions, or any custom terminology). The system rests on nine independent pillars: Company, Dynamic Organization Unit Types, Organization Units, Positions, Reporting Hierarchy, Roles, Features, Feature Permissions, and Permission Scopes.

## Glossary

- **Company**: An isolated tenant that owns Users, Org Structure, Positions, Roles, Permissions, and Settings. Each Company has a Company_Super_Admin.
- **Company_Super_Admin**: The highest-privileged role within a Company, capable of defining all configurable structures, permissions, and settings for that Company.
- **Organization_Unit_Type**: A company-defined classification for organizational groupings (e.g., Department, Division, Branch, Region, Cluster, Tribe, Squad, Team, Chapter, Guild, Domain, Portfolio, Practice, Studio, Crew). NOT hardcoded.
- **Organization_Unit**: An instance of an Organization_Unit_Type, supporting parent/child relationships, unlimited nesting, and flexible hierarchy.
- **Position**: A named job title (e.g., CEO, CTO, Engineering Manager, Staff Engineer) used for career structure. Positions do NOT grant permissions.
- **Reporting_Hierarchy**: The manager-to-direct-report relationship between users, independent of Organization_Unit placement. A user may belong to one Organization_Unit while reporting to a manager in a different unit.
- **Role**: A configurable collection of Feature_Permissions assignable to users. Users may hold multiple Roles. Permissions are assigned to Roles, NOT to Positions.
- **Feature**: An application module that self-registers in the system (e.g., Dashboard, Calendar, Leave, Users, Org Chart, Reports, Documents, Expenses, Payroll, Recruitment, Performance Reviews, Assets, Settings).
- **Feature_Permission**: A business-specific action defined by a Feature (e.g., view_own, submit_request, approve, manage_policies). NOT limited to CRUD.
- **Permission_Scope**: The organizational boundary within which a Feature_Permission applies — one of OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, or GLOBAL.
- **Authorization_Engine**: The core component responsible for evaluating multi-step authorization decisions: authentication, role check, feature permission check, action validity, and scope enforcement.
- **Admin_Panel**: The application interface through which Company_Super_Admin configures all organizational structures, positions, roles, features, permissions, and scopes.
- **Scope_Resolution**: The process by which the Authorization_Engine determines which data entities fall within a user's permitted scope based on Organization_Unit placement and Reporting_Hierarchy.
- **Audit_Record**: A log entry capturing configuration changes including the actor, previous state, new state, and timestamp.

## Requirements

### Requirement 1: Company Tenant Isolation

**User Story:** As a platform operator, I want each company to operate as an isolated tenant, so that organizational structures, users, roles, and permissions in one company cannot affect another.

#### Acceptance Criteria

1. THE Platform SHALL isolate each Company as an independent tenant with its own Users, Organization_Unit_Types, Organization_Units, Positions, Roles, Features, Feature_Permissions, and Settings
2. WHEN a new Company is created, THE Platform SHALL provision a Company_Super_Admin user with full administrative capabilities for that Company
3. WHEN a User in Company A performs an action, THE Authorization_Engine SHALL prevent access to data belonging to Company B regardless of Role or Permission_Scope assignments
4. THE Platform SHALL enforce tenant isolation at the data layer such that all queries are scoped to the requesting user's Company identifier
5. IF a request references a resource belonging to a different Company, THEN THE Authorization_Engine SHALL deny the request and return a 403 Forbidden response

### Requirement 2: Dynamic Organization Unit Types

**User Story:** As a Company Super Admin, I want to define my own organizational unit types without relying on hardcoded structures, so that the platform adapts to any organizational model (departments, tribes, squads, chapters, guilds, or any custom terminology).

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Company_Super_Admin to create Organization_Unit_Types with the following attributes: Name, Description, Icon (optional), Display Order, Color (optional), and Active/Archived status
2. THE Platform SHALL NOT impose any predefined or hardcoded Organization_Unit_Type definitions upon Company creation
3. WHEN the Company_Super_Admin creates a new Organization_Unit_Type, THE Platform SHALL make it immediately available for creating Organization_Units
4. WHEN the Company_Super_Admin archives an Organization_Unit_Type, THE Platform SHALL prevent creation of new Organization_Units of that type while preserving existing units
5. THE Platform SHALL NOT enforce any predefined hierarchy between Organization_Unit_Types — any type can serve as parent or child of any other type
6. THE Admin_Panel SHALL allow the Company_Super_Admin to rename, reorder, and modify Organization_Unit_Types at any time without affecting existing unit assignments
7. THE Platform SHALL validate that Organization_Unit_Type names are unique within a Company

### Requirement 3: Organization Unit Management

**User Story:** As a Company Super Admin, I want to build and manage organization units using my defined types with flexible parent/child relationships, so that the company hierarchy can reflect any real-world structure.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Company_Super_Admin to create Organization_Units by selecting from any active Organization_Unit_Type defined for the Company
2. THE Platform SHALL support parent/child relationships between Organization_Units with unlimited nesting depth and no system-imposed maximum level restriction
3. THE Platform SHALL allow any Organization_Unit_Type to serve as parent of any other Organization_Unit_Type within the hierarchy
4. WHEN an Organization_Unit is moved to a new parent, THE Platform SHALL update all descendant relationships and recalculate scope boundaries for affected Users
5. THE Platform SHALL detect and reject circular references when creating or moving Organization_Units
6. THE Admin_Panel SHALL support assigning a manager and multiple users to each Organization_Unit
7. WHEN an Organization_Unit is archived, THE Platform SHALL preserve its historical data and exclude it from active hierarchy traversals
8. THE Admin_Panel SHALL allow renaming, moving, and restructuring Organization_Units through drag-and-drop reordering

### Requirement 4: Position Configuration

**User Story:** As a Company Super Admin, I want to define job positions independently from permissions, so that career structures and titles are descriptive without granting system access.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Company_Super_Admin to create Position records with: Name, Description, Career Level, Can Have Direct Reports (boolean), and Default Reporting Level (optional)
2. THE Platform SHALL NOT grant any Feature_Permissions based on a user's assigned Position
3. THE Platform SHALL allow assigning exactly one Position to each user within the Company
4. WHEN a Position is modified, THE Platform SHALL update the display for all users holding that Position without affecting their Role or Permission assignments
5. THE Platform SHALL NOT impose any predefined or hardcoded Position definitions upon Company creation
6. THE Admin_Panel SHALL allow creating, renaming, archiving, and deleting Positions at any time

### Requirement 5: Independent Reporting Hierarchy

**User Story:** As a Company Super Admin, I want the reporting hierarchy (who reports to whom) to be independent of the organization unit structure, so that matrix organizations, cross-functional teams, and flexible reporting lines are supported.

#### Acceptance Criteria

1. THE Platform SHALL maintain each user's Reporting_Hierarchy assignment (Manager) independently from their Organization_Unit assignment
2. THE Platform SHALL allow a user to belong to one Organization_Unit while reporting to a manager who belongs to a different Organization_Unit
3. WHEN a manager is assigned to a user, THE Platform SHALL automatically derive the direct reports list for that manager
4. THE Platform SHALL detect and reject circular references in the Reporting_Hierarchy (e.g., A reports to B, B reports to A)
5. WHEN evaluating DIRECT_REPORTS scope, THE Authorization_Engine SHALL use the Reporting_Hierarchy (not Organization_Unit membership) to determine which users are direct reports
6. THE Platform SHALL allow a user to have zero or one manager — having no manager is valid for top-level executives
7. WHEN a manager is removed or changed, THE Platform SHALL recalculate DIRECT_REPORTS scope boundaries for the affected managers immediately

### Requirement 6: Role Management

**User Story:** As a Company Super Admin, I want to create, duplicate, rename, archive, and delete roles with configurable feature permissions, so that I can tailor access control to the company's specific job functions.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Company_Super_Admin to create Role records with a unique name, description, and a configurable set of Feature_Permissions with associated Permission_Scopes
2. THE Platform SHALL NOT provide any predefined Default_Roles upon Company creation beyond the Company_Super_Admin Role
3. WHEN the Company_Super_Admin duplicates an existing Role, THE Platform SHALL create a new Role with an identical Feature_Permission set and a unique name
4. THE Platform SHALL support assigning multiple Roles to a single User
5. WHEN multiple Roles are assigned to a User, THE Authorization_Engine SHALL combine all Feature_Permissions using a union strategy where the broadest Permission_Scope for each Feature_Permission takes precedence
6. WHEN a Role's Feature_Permissions are modified, THE Platform SHALL invalidate all cached permission evaluations for Users assigned that Role within 5 seconds
7. THE Admin_Panel SHALL support archiving and deleting Roles, with deletion prevented if the Role is currently assigned to any User
8. THE Platform SHALL assign permissions to Roles exclusively — assigning permissions directly to Positions or Users is not supported

### Requirement 7: Feature Self-Registration

**User Story:** As a platform developer, I want application features to self-register their available permissions, so that adding new modules to the platform requires no code changes to the authorization system.

#### Acceptance Criteria

1. WHEN a new Feature module is deployed, THE Feature SHALL register itself with the Platform by providing a unique feature key, display name, description, and a list of Feature_Permission definitions
2. THE Platform SHALL store each Feature_Permission with a unique key, display name, and description within the owning Feature
3. THE Platform SHALL allow Features to define business-specific actions beyond CRUD (e.g., approve, reject, override, manage_policies, submit_request, escalate)
4. WHEN a Feature registers additional Feature_Permissions after initial registration, THE Platform SHALL make the new permissions available for Role assignment immediately without application restart
5. THE Platform SHALL validate that Feature_Permission keys are unique within a Feature
6. WHEN a Feature_Permission is deprecated, THE Platform SHALL mark it as deprecated rather than deleting it, preserving existing Role assignments and audit history
7. THE Admin_Panel SHALL allow the Company_Super_Admin to enable or disable Features per Company independently

### Requirement 8: Feature Permission Assignment

**User Story:** As a Company Super Admin, I want to assign specific feature permissions with scope restrictions to roles, so that each role has precisely the access level required for its function.

#### Acceptance Criteria

1. THE Platform SHALL store permission assignments as tuples of (Role, Feature, Feature_Permission, Permission_Scope)
2. WHEN a Feature_Permission is assigned to a Role, THE Admin_Panel SHALL validate that the Feature and Feature_Permission exist in the Feature registry
3. THE Admin_Panel SHALL support bulk assignment of Feature_Permissions to a Role in a single operation
4. WHEN a Feature_Permission is removed from a Role, THE Platform SHALL cascade the removal to all cached evaluations for Users assigned that Role
5. THE Platform SHALL prevent assigning duplicate permission entries (same Role, Feature, Feature_Permission, and Permission_Scope combination)
6. THE Admin_Panel SHALL display available Feature_Permissions grouped by Feature for easy selection during Role configuration

### Requirement 9: Permission Scope System

**User Story:** As a Company Super Admin, I want permission scopes to determine the data boundaries for each permission, so that the same permission can grant different levels of data visibility depending on scope assignment.

#### Acceptance Criteria

1. THE Authorization_Engine SHALL support six Permission_Scope levels: OWN, DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, COMPANY, and GLOBAL
2. WHEN evaluating OWN scope, THE Authorization_Engine SHALL restrict access to records owned by or assigned to the requesting user exclusively
3. WHEN evaluating DIRECT_REPORTS scope, THE Authorization_Engine SHALL grant access to records owned by users who report directly to the requesting user according to the Reporting_Hierarchy
4. WHEN evaluating ORGANIZATION_UNIT scope, THE Authorization_Engine SHALL grant access to records owned by all users assigned to the same Organization_Unit as the requesting user
5. WHEN evaluating BRANCH scope, THE Authorization_Engine SHALL grant access to records owned by all users within the requesting user's Organization_Unit and all of its descendant Organization_Units recursively
6. WHEN evaluating COMPANY scope, THE Authorization_Engine SHALL grant access to records owned by all users within the same Company as the requesting user
7. WHEN evaluating GLOBAL scope, THE Authorization_Engine SHALL grant unrestricted access across all Companies — restricted exclusively to platform-level administrators
8. WHEN a user holds the same Feature_Permission at multiple scopes through different Roles, THE Authorization_Engine SHALL apply the broadest scope

### Requirement 10: Authorization Evaluation Flow

**User Story:** As a platform engineer, I want the authorization engine to evaluate access requests through a deterministic multi-step process, so that permission decisions are consistent, auditable, and performant.

#### Acceptance Criteria

1. WHEN an access request is received, THE Authorization_Engine SHALL evaluate authorization by checking in sequence: (a) user is authenticated, (b) user has at least one assigned Role, (c) an assigned Role grants the required Feature_Permission, (d) the requested action is valid for the Feature, (e) the Permission_Scope allows access to the target resource
2. WHEN any step in the authorization evaluation sequence fails, THE Authorization_Engine SHALL deny access and return a 403 Forbidden response with a non-specific error message
3. THE Authorization_Engine SHALL complete permission evaluation within 50 milliseconds for cached permission sets
4. THE Authorization_Engine SHALL cache resolved permission sets in Redis with a time-to-live of 5 minutes using the key pattern `permissions:v2:{companyId}:{userId}`
5. WHEN a User has no Role assignments, THE Authorization_Engine SHALL deny all access requests for that User
6. THE Authorization_Engine SHALL log denied access attempts with the user identifier, company identifier, requested feature, action, target resource identifier, and reason for denial
7. WHEN the cache is unavailable, THE Authorization_Engine SHALL fall back to database evaluation and continue to operate without service interruption
8. WHEN a Company_Super_Admin performs a permission check, THE Authorization_Engine SHALL bypass the standard evaluation sequence and return an immediate allow decision for resources within their Company

### Requirement 11: Company Super Admin Privileges

**User Story:** As a Company Super Admin, I want unrestricted administrative access within my company, so that I can configure all organizational structures, roles, and permissions without being blocked by the authorization system.

#### Acceptance Criteria

1. THE Authorization_Engine SHALL grant Company_Super_Admin users access to all Features, actions, and scopes within their Company without individual permission checks
2. THE Company_Super_Admin SHALL have the ability to: create and manage Organization_Unit_Types, create and manage Organization_Units at any depth and breadth, create and manage Positions, create and manage Roles, assign managers and users, configure Feature availability, configure Feature_Permissions and Permission_Scopes for Roles, and override company-level permission configurations
3. THE Platform SHALL require a minimum of one Company_Super_Admin user per Company at all times
4. THE Platform SHALL restrict GLOBAL scope assignments exclusively to platform-level administrators — Company_Super_Admin scope is limited to COMPANY
5. WHEN the last Company_Super_Admin attempts to remove their own admin role, THE Platform SHALL reject the operation and return a descriptive error

### Requirement 12: Extensibility and Runtime Configuration

**User Story:** As a platform developer, I want new features and organizational structures to integrate with the authorization system without code changes, so that the platform scales with customer needs dynamically.

#### Acceptance Criteria

1. WHEN a new Feature is registered at runtime, THE Authorization_Engine SHALL enforce permissions for the new Feature immediately after registration without application restart
2. WHEN the Company_Super_Admin creates new Organization_Unit_Types, Positions, or Roles, THE Platform SHALL incorporate these into authorization decisions immediately without code deployment
3. THE Platform SHALL support adding new Permission_Scopes in future versions without modifying existing Role assignments or cached evaluations
4. WHEN a Feature is disabled for a Company, THE Authorization_Engine SHALL deny all actions for that Feature for all Users in that Company regardless of Role assignments
5. WHEN an administrator modifies any permission, role, or organizational configuration, THE Platform SHALL create an Audit_Record capturing the actor, previous state, new state, and timestamp
6. THE Platform SHALL provide standard REST endpoints for all administrative operations (CRUD for Organization_Unit_Types, Organization_Units, Positions, Roles, Feature configuration, and Permission assignment)

### Requirement 13: Migration from Existing Permission System

**User Story:** As a platform engineer, I want a clear migration path from the current three-scope RBAC system to the new dynamic authorization system, so that existing users retain equivalent access during the transition.

#### Acceptance Criteria

1. THE Platform SHALL provide a migration utility that maps existing SELF scope assignments to OWN scope in the new system
2. THE Platform SHALL provide a migration utility that maps existing TEAM scope assignments to DIRECT_REPORTS scope in the new system
3. THE Platform SHALL provide a migration utility that maps existing ORGANIZATION scope assignments to COMPANY scope in the new system
4. WHEN the migration utility is executed, THE Platform SHALL preserve all existing Role names and descriptions in the new Role records
5. WHEN the migration utility is executed, THE Platform SHALL map existing `action:resource` permission pairs to the new `feature:permission` format based on a configurable mapping table
6. THE migration utility SHALL convert the existing hardcoded Department/Tribe/Cluster/Squad structure into company-defined Organization_Unit_Types and Organization_Units
7. THE migration utility SHALL generate a report listing all migrated assignments, unmapped permissions, structural conversions, and any conflicts detected during migration
8. WHEN migration is complete, THE Platform SHALL maintain backward-compatible API endpoints for a deprecation period to allow client applications to transition

### Requirement 14: Permission Serialization and Parsing

**User Story:** As a developer, I want permissions to follow a consistent string format that can be parsed and serialized reliably, so that permission definitions can be stored, transmitted, and validated uniformly across the platform.

#### Acceptance Criteria

1. THE Platform SHALL represent permissions in the canonical string format `feature:permission:scope` where each segment contains only lowercase alphanumeric characters and underscores
2. WHEN a permission string is parsed, THE Platform SHALL extract the feature key, permission key, and scope and validate each segment against the Feature registry and Permission_Scope definitions
3. THE Permission_Parser SHALL reject permission strings that do not contain exactly three colon-separated segments
4. THE Permission_Serializer SHALL produce a valid permission string from any (Feature, Feature_Permission, Permission_Scope) tuple stored in the database
5. FOR ALL valid permission tuples, parsing the serialized string then serializing the parsed result SHALL produce an identical string (round-trip property)
6. WHEN a permission string contains an invalid scope value, THE Permission_Parser SHALL return a descriptive error identifying the invalid segment

### Requirement 15: Scope Resolution Performance

**User Story:** As a platform engineer, I want scope resolution to perform efficiently for large hierarchies, so that authorization decisions remain fast as companies grow their organizational structures.

#### Acceptance Criteria

1. THE Authorization_Engine SHALL resolve the full ancestry path for any Organization_Unit within 100 milliseconds for hierarchies with up to 10,000 Organization_Units
2. THE Authorization_Engine SHALL resolve BRANCH scope (all descendants of an Organization_Unit) within 100 milliseconds for hierarchies with up to 10,000 Organization_Units
3. WHEN an Organization_Unit is moved or restructured, THE Platform SHALL recalculate and re-cache affected scope boundaries within 10 seconds
4. THE Platform SHALL cache resolved Organization_Unit hierarchy paths to avoid repeated tree traversals during scope evaluation
5. WHEN the hierarchy cache is invalidated, THE Platform SHALL rebuild it lazily on next access rather than eagerly for the entire tree
6. THE Platform SHALL support Companies with up to 100,000 users and 10,000 Organization_Units without degradation of authorization response times below the 50 millisecond threshold
