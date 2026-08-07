# Requirements Document

## Introduction

This feature connects the existing org chart frontend page to the backend, replacing the MockPersonRepository with real API endpoints. It introduces two new API endpoints that return the full reporting hierarchy tree and unit-based employee groupings, along with frontend service hooks that consume these endpoints. The page gains two view modes: a "Reporting" view (who reports to whom) and a "Teams" view (by organizational unit).

## Glossary

- **Org_Chart_Service**: The backend NestJS service module responsible for assembling and returning org chart data
- **Org_Chart_API**: The set of REST endpoints under `/companies/:companyId/org-chart` that serve hierarchy and unit data
- **Reporting_Tree**: A hierarchical tree structure where each node represents an employee and contains nested direct reports
- **Tree_Node**: A single node in the Reporting_Tree containing employee identity, position, department, avatar, and an array of direct report Tree_Nodes
- **Org_Unit**: An organizational grouping (squad, tribe, cluster, department) with a type, parent unit, and member employees
- **Unit_View**: A response structure containing employees grouped by a specific Org_Unit, including the unit's ancestor chain
- **Frontend_Org_Chart_Hook**: A TanStack Query-based React hook that fetches and caches org chart data from the Org_Chart_API
- **Redis_Cache**: The Redis-based caching layer used to store pre-computed tree responses
- **Company_ID**: A unique identifier for the company scope of all org chart queries

## Requirements

### Requirement 1: Full Reporting Tree Endpoint

**User Story:** As a frontend application, I want to fetch the entire reporting hierarchy in a single API call, so that the org chart page can render the tree without multiple round-trip requests.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/v2/companies/:companyId/org-chart`, THE Org_Chart_API SHALL return a JSON array of root Tree_Nodes representing employees with no manager
2. THE Org_Chart_API SHALL include for each Tree_Node the fields: id, fullName, email, positionTitle, managerId, departmentName, avatarUrl, and directReports
3. THE Org_Chart_API SHALL nest direct reports recursively within the directReports array of each Tree_Node
4. THE Org_Chart_Service SHALL resolve the full tree using a single database query that fetches all reporting relationships and employees for the company, avoiding N+1 query patterns
5. WHEN a companyId does not exist, THE Org_Chart_API SHALL return HTTP 404 with a descriptive error message
6. THE Org_Chart_API SHALL require valid authentication and authorization to access the endpoint

### Requirement 2: Tree Response Caching

**User Story:** As a system operator, I want the org chart tree response to be cached, so that repeated requests do not re-query the database unnecessarily.

#### Acceptance Criteria

1. WHEN a valid org chart tree response is generated, THE Org_Chart_Service SHALL store the response in Redis_Cache with a key scoped to the Company_ID
2. WHEN a cached response exists for a Company_ID, THE Org_Chart_Service SHALL return the cached response without querying the database
3. WHEN a reporting relationship is created, updated, or removed for a company, THE Org_Chart_Service SHALL invalidate the cached tree for that Company_ID
4. WHEN a user's profile information (name, position, department, avatar) changes, THE Org_Chart_Service SHALL invalidate the cached tree for the affected Company_ID
5. THE Org_Chart_Service SHALL set a time-to-live of 5 minutes on cached tree entries as a safety net against stale data

### Requirement 3: Unit-Based Employee Grouping Endpoint

**User Story:** As a frontend application, I want to fetch employees grouped by a specific organizational unit, so that the org chart page can render a team-based view.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/v2/companies/:companyId/org-chart/unit/:unitId`, THE Org_Chart_API SHALL return employees who are members of the specified Org_Unit
2. THE Org_Chart_API SHALL include for each employee the fields: id, fullName, positionTitle, and status
3. THE Org_Chart_API SHALL include a parentChain array representing the ancestor Org_Units from root to the specified unit, each with id, name, and typeName
4. WHEN the specified unitId does not exist within the company, THE Org_Chart_API SHALL return HTTP 404 with a descriptive error message
5. THE Org_Chart_API SHALL include the unit details (id, name, typeName, managerId) in the response alongside the employee list
6. THE Org_Chart_API SHALL require valid authentication and authorization to access the endpoint

### Requirement 4: Frontend Org Chart Data Hook

**User Story:** As a frontend developer, I want a TanStack Query hook that fetches the full reporting tree, so that the org chart page can consume real data with proper loading, error, and caching states.

#### Acceptance Criteria

1. THE Frontend_Org_Chart_Hook SHALL expose a `useOrgChart(companyId)` function that returns the reporting tree data, loading state, and error state
2. WHEN the companyId parameter is provided, THE Frontend_Org_Chart_Hook SHALL make a GET request to the Org_Chart_API full tree endpoint
3. WHEN the API returns an error, THE Frontend_Org_Chart_Hook SHALL expose the error message to the consuming component
4. THE Frontend_Org_Chart_Hook SHALL leverage TanStack Query stale-while-revalidate caching with a staleTime of 30 seconds
5. WHEN the companyId parameter is undefined or empty, THE Frontend_Org_Chart_Hook SHALL not issue a request (query disabled)

### Requirement 5: Frontend Unit View Data Hook

**User Story:** As a frontend developer, I want a TanStack Query hook that fetches employees by org unit, so that the teams view can display unit-based groupings.

#### Acceptance Criteria

1. THE Frontend_Org_Chart_Hook SHALL expose a `useOrgChartByUnit(companyId, unitId)` function that returns unit employees, the parent chain, loading state, and error state
2. WHEN both companyId and unitId are provided, THE Frontend_Org_Chart_Hook SHALL make a GET request to the Org_Chart_API unit endpoint
3. WHEN either companyId or unitId is undefined or empty, THE Frontend_Org_Chart_Hook SHALL not issue a request (query disabled)
4. WHEN the API returns an error, THE Frontend_Org_Chart_Hook SHALL expose the error message to the consuming component

### Requirement 6: Org Chart Page Integration

**User Story:** As a user, I want the org chart page to display real employee data from the backend instead of mock data, so that the chart reflects the actual organization.

#### Acceptance Criteria

1. THE Org_Chart_Page SHALL use `useOrgChart(companyId)` to fetch reporting tree data instead of MockPersonRepository
2. THE Org_Chart_Page SHALL display a "Reporting" view mode showing the hierarchical tree from the reporting endpoint
3. THE Org_Chart_Page SHALL display a "Teams" view mode showing employees grouped by organizational unit
4. WHEN the "Teams" view mode is active, THE Org_Chart_Page SHALL provide a unit selector allowing the user to choose which Org_Unit to display
5. WHEN the "Teams" view mode is active and a unit is selected, THE Org_Chart_Page SHALL use `useOrgChartByUnit(companyId, unitId)` to fetch and display the unit's employees
6. THE Org_Chart_Page SHALL preserve the existing visual tree rendering components (OrgFlow/ReactFlow)
7. WHILE data is loading, THE Org_Chart_Page SHALL display a loading indicator
8. IF the API returns an error, THEN THE Org_Chart_Page SHALL display the error message to the user

### Requirement 7: Tree Construction Correctness

**User Story:** As a developer, I want to verify that the server-side tree construction is correct, so that the hierarchy displayed in the frontend accurately reflects the database state.

#### Acceptance Criteria

1. FOR ALL sets of reporting relationships, THE Org_Chart_Service SHALL produce a tree where every employee appears exactly once
2. FOR ALL sets of reporting relationships, THE Org_Chart_Service SHALL place each employee under the Tree_Node of the employee's manager
3. FOR ALL sets of reporting relationships where an employee has no manager record, THE Org_Chart_Service SHALL place that employee as a root Tree_Node
4. FOR ALL valid tree responses, parsing the tree then flattening it back to a list of (userId, managerId) pairs SHALL produce the original set of relationships (round-trip property)
