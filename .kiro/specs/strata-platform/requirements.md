# Requirements Document

## Introduction

Strata is an enterprise workforce management platform that enables organizations to manage their organizational structures, employees, workforce and capacity planning, budgeting, leave management, and engineering team structures. The system is built as a monorepo using Next.js (frontend), NestJS (backend), and PostgreSQL, designed for enterprise scale with thousands of employees and complex organizational hierarchies.

## Glossary

- **Strata**: The enterprise workforce management platform application
- **Person**: A human individual record in the system, independent of employment status
- **Employee**: A workforce membership record linking a Person to an Organization with employment details
- **UIN (Unique Identification Number)**: A unique personal identifier assigned to each Employee, serving as their organizational identity number
- **User**: An application access account that grants a Person the ability to log into and interact with Strata
- **Organization**: A top-level entity representing a company or enterprise using Strata
- **Department**: A subdivision within an Organization that groups Employees by function
- **Position**: A defined role or job title within the Organization, independent of any specific Employee
- **Tribe**: The highest level of engineering hierarchy, containing multiple Clusters
- **Cluster**: A grouping of Squads within a Tribe
- **Squad**: A cross-functional engineering team within a Cluster
- **Team_Membership**: A many-to-many relationship linking an Employee to one or more Squads with capacity allocation
- **Role**: A named collection of Permissions assigned to Users
- **Permission**: A specific action that can be performed within the system
- **Scope**: The boundary within which a Permission applies (SELF, TEAM, or ORGANIZATION)
- **RoleAssignment**: The association of a Role to a User within a specific Scope
- **Audit_Record**: A historical log entry capturing changes to domain entities
- **Capacity_Allocation**: A percentage-based assignment of an Employee's time to a specific Squad
- **Org_Chart**: A visual representation of the organizational hierarchy rendered using xyflow/react
- **Background_Job**: An asynchronous task processed by the Worker service via Redis and BullMQ
- **API_Service**: The NestJS backend application that serves as the source of truth for all business rules
- **Web_Application**: The Next.js frontend application providing the user interface
- **Worker_Service**: The background job processing application using BullMQ

## Requirements

### Requirement 1: Person Management

**User Story:** As an HR administrator, I want to manage person records, so that I can maintain a central registry of all individuals associated with the organization.

#### Acceptance Criteria

1. THE API_Service SHALL store Person records with fields for full name, date of birth, contact email, phone number, and address
2. WHEN a new Person record is created, THE API_Service SHALL validate all required fields and return a descriptive error for invalid inputs
3. WHEN a Person record is updated, THE API_Service SHALL create an Audit_Record capturing the previous and new values
4. WHEN a Person record is requested, THE API_Service SHALL return the Person data within 200ms for single record retrieval
5. THE Web_Application SHALL render Person management forms that comply with WCAG 2.2 AA accessibility standards

### Requirement 2: Employee Management

**User Story:** As an HR administrator, I want to manage employee records linked to persons, so that I can track workforce membership, employment status, and job assignments.

#### Acceptance Criteria

1. THE API_Service SHALL create Employee records linking a Person to an Organization with a UIN, start date, position, department, and employment status
2. WHEN an Employee is created, THE API_Service SHALL assign a unique UIN that is immutable and unique across the Organization
3. WHEN an Employee is created without a valid linked Person record, THE API_Service SHALL reject the request with a descriptive error
3. WHEN an Employee's status changes, THE API_Service SHALL create an Audit_Record capturing the transition and timestamp
4. THE API_Service SHALL support querying Employees by department, position, status, and date range
5. WHEN an Employee is terminated, THE API_Service SHALL retain the Employee record with a terminated status and end date rather than deleting it

### Requirement 3: Organization Structure Management

**User Story:** As an organization administrator, I want to define and manage departments and positions, so that I can model the company's hierarchical structure.

#### Acceptance Criteria

1. THE API_Service SHALL support creating Department records with a name, parent department reference, and description
2. THE API_Service SHALL support nesting Departments to a minimum depth of 10 levels
3. WHEN a Department is created with a circular parent reference, THE API_Service SHALL reject the request with a descriptive error
4. THE API_Service SHALL support creating Position records with a title, level, department association, and description
5. WHEN a Department containing active Employees is deleted, THE API_Service SHALL reject the deletion and return a list of affected Employees

### Requirement 4: Organization Chart Visualization

**User Story:** As a manager, I want to view an interactive organization chart, so that I can understand reporting relationships and organizational structure at a glance.

#### Acceptance Criteria

1. THE Web_Application SHALL render the Org_Chart using xyflow/react with custom nodes representing Departments and Employees
2. THE Web_Application SHALL support zoom, pan, and drag-drop interactions on the Org_Chart
3. WHEN the Org_Chart contains more than 1000 nodes, THE Web_Application SHALL use virtualization to maintain a frame rate above 30fps
4. THE Web_Application SHALL provide keyboard navigation for the Org_Chart that complies with WCAG 2.2 AA standards
5. WHEN a user clicks a node in the Org_Chart, THE Web_Application SHALL display a detail panel with the entity's information

### Requirement 5: Engineering Team Structure Management

**User Story:** As an engineering manager, I want to manage Tribes, Clusters, and Squads, so that I can organize engineering teams and track team membership.

#### Acceptance Criteria

1. THE API_Service SHALL support creating and managing Tribe, Cluster, and Squad entities in a strict hierarchy where Tribes contain Clusters and Clusters contain Squads
2. WHEN a Squad is created without a valid parent Cluster, THE API_Service SHALL reject the request with a descriptive error
3. THE API_Service SHALL support Team_Membership records linking an Employee to one or more Squads
4. WHEN a Team_Membership is created, THE API_Service SHALL require a Capacity_Allocation percentage between 1 and 100
5. WHEN the total Capacity_Allocation for an Employee across all Squads exceeds 100 percent, THE API_Service SHALL reject the new allocation with a descriptive error

### Requirement 6: Capacity Planning

**User Story:** As a team lead, I want to allocate employee capacity across squads, so that I can plan workforce distribution and identify over- or under-allocation.

#### Acceptance Criteria

1. THE API_Service SHALL store Capacity_Allocation records as integer percentages between 1 and 100 for each Employee-Squad pair
2. THE API_Service SHALL enforce that the sum of all Capacity_Allocation values for a single Employee does not exceed 100 percent
3. WHEN a Capacity_Allocation is updated, THE API_Service SHALL create an Audit_Record capturing the previous and new allocation values
4. THE Web_Application SHALL display a capacity overview showing each Employee's total allocated percentage and remaining availability
5. WHEN a Squad's total allocated capacity changes, THE Web_Application SHALL update the displayed values within 2 seconds without requiring a full page reload

### Requirement 7: Budget Planning

**User Story:** As a finance manager, I want to plan and track departmental budgets, so that I can manage organizational spending and forecast costs.

#### Acceptance Criteria

1. THE API_Service SHALL support creating budget records associated with a Department, fiscal period, and amount
2. WHEN a budget record is created with a negative amount, THE API_Service SHALL reject the request with a descriptive error
3. THE API_Service SHALL calculate actual spend against budget using Employee compensation data linked to each Department
4. THE Web_Application SHALL display budget versus actual spend with variance calculations for each Department
5. WHEN actual spend exceeds the budgeted amount for a Department, THE Web_Application SHALL display a visual warning indicator

### Requirement 8: Leave Management

**User Story:** As an employee, I want to request and track leave, so that I can manage my time off and managers can plan for absences.

#### Acceptance Criteria

1. THE API_Service SHALL support creating leave requests with a type, start date, end date, and reason
2. WHEN a leave request overlaps with an existing approved leave request for the same Employee, THE API_Service SHALL reject the request with a descriptive error
3. WHEN a leave request is submitted, THE API_Service SHALL set the status to pending and notify the Employee's direct manager via the notification system
4. THE API_Service SHALL support leave request status transitions: pending to approved, pending to rejected, and approved to cancelled
5. IF a leave request status transition is invalid, THEN THE API_Service SHALL reject the transition and return the list of valid transitions

### Requirement 9: Roles and Permissions

**User Story:** As a system administrator, I want to define roles with scoped permissions, so that I can control access to features and data based on organizational responsibility.

#### Acceptance Criteria

1. THE API_Service SHALL support creating Role records with a name, description, and a set of associated Permissions
2. THE API_Service SHALL enforce Permission Scope levels of SELF, TEAM, and ORGANIZATION for each RoleAssignment
3. WHEN a User attempts an action without a matching Permission and Scope, THE API_Service SHALL return a 403 Forbidden response within 50ms
4. THE API_Service SHALL support assigning multiple Roles to a single User
5. WHEN a Role's Permissions are modified, THE API_Service SHALL invalidate cached permission evaluations for all Users assigned that Role

### Requirement 10: Audit and Historical Reporting

**User Story:** As a compliance officer, I want to view historical changes to organizational data, so that I can audit modifications and understand how the organization evolved over time.

#### Acceptance Criteria

1. THE API_Service SHALL create an Audit_Record for every create, update, and delete operation on domain entities
2. THE API_Service SHALL store each Audit_Record with the acting User, timestamp, entity type, entity identifier, operation type, and a diff of changed fields
3. WHEN Audit_Records are queried by entity, date range, or user, THE API_Service SHALL return results paginated with a maximum of 100 records per page
4. THE API_Service SHALL retain Audit_Records for a minimum of 7 years without modification or deletion
5. THE Web_Application SHALL display Audit_Records in a searchable, filterable table with columns for timestamp, user, entity, and operation

### Requirement 11: Background Job Processing

**User Story:** As a system operator, I want long-running tasks processed asynchronously, so that the API remains responsive and resource-intensive operations do not block user interactions.

#### Acceptance Criteria

1. THE Worker_Service SHALL process Background_Jobs from Redis queues using BullMQ
2. WHEN a Background_Job fails, THE Worker_Service SHALL retry the job up to 3 times with exponential backoff
3. IF a Background_Job fails after all retry attempts, THEN THE Worker_Service SHALL mark the job as failed and create a notification for system administrators
4. THE API_Service SHALL enqueue Background_Jobs for operations including report generation, bulk data imports, and notification delivery
5. THE Worker_Service SHALL process Background_Jobs independently of the API_Service such that Worker_Service downtime does not affect API_Service availability

### Requirement 12: Notification System

**User Story:** As a user, I want to receive notifications for relevant events, so that I can stay informed about actions that require my attention.

#### Acceptance Criteria

1. THE API_Service SHALL support creating notifications with a recipient User, message, type, and priority level
2. WHEN a notification is created, THE API_Service SHALL enqueue delivery as a Background_Job
3. THE Web_Application SHALL display unread notifications with a badge count in the navigation header
4. WHEN a User marks a notification as read, THE Web_Application SHALL update the badge count within 1 second without a page reload
5. THE API_Service SHALL support querying notifications by read status, type, and date range with pagination

### Requirement 13: Authentication and Session Management

**User Story:** As a user, I want to securely log in and maintain my session, so that I can access the platform with confidence that my account is protected.

#### Acceptance Criteria

1. THE API_Service SHALL authenticate Users using email and password with bcrypt-hashed password storage
2. WHEN authentication succeeds, THE API_Service SHALL issue a signed JWT access token with a maximum lifetime of 15 minutes and a refresh token with a maximum lifetime of 7 days
3. WHEN an invalid or expired access token is presented, THE API_Service SHALL return a 401 Unauthorized response
4. THE API_Service SHALL invalidate all refresh tokens for a User when the User's password is changed
5. IF more than 5 failed login attempts occur for a single email within 15 minutes, THEN THE API_Service SHALL temporarily lock the account for 30 minutes

### Requirement 14: Search and Filtering

**User Story:** As a user, I want to search and filter across people, employees, departments, and squads, so that I can quickly locate relevant records in a large organization.

#### Acceptance Criteria

1. THE API_Service SHALL support full-text search across Person name, Employee position title, Department name, and Squad name fields
2. WHEN a search query is submitted, THE API_Service SHALL return results within 500ms for organizations with up to 10,000 records
3. THE API_Service SHALL support combining search with filters for department, status, role, and date range
4. THE Web_Application SHALL display search results with highlighted matching terms and pagination
5. WHEN search input changes, THE Web_Application SHALL debounce requests by 300ms before sending the query to the API_Service

### Requirement 15: Theme and Accessibility

**User Story:** As a user, I want to switch between light and dark themes, so that I can use the application comfortably in different environments while maintaining accessibility.

#### Acceptance Criteria

1. THE Web_Application SHALL support light and dark color themes selectable by the User
2. THE Web_Application SHALL persist the selected theme preference across sessions
3. THE Web_Application SHALL maintain WCAG 2.2 AA color contrast ratios in both light and dark themes
4. THE Web_Application SHALL support keyboard navigation for all interactive elements
5. THE Web_Application SHALL provide visible focus indicators that meet WCAG 2.2 AA minimum contrast requirements

### Requirement 16: Performance and Scalability

**User Story:** As a system architect, I want the platform to meet enterprise performance standards, so that the system remains responsive under load with thousands of concurrent users.

#### Acceptance Criteria

1. THE Web_Application SHALL achieve Core Web Vitals scores of LCP under 2.5 seconds, FID under 100ms, and CLS under 0.1
2. THE API_Service SHALL respond to list endpoints with pagination within 300ms for datasets of up to 50,000 records
3. THE API_Service SHALL use Redis caching for permission evaluations and frequently accessed read queries
4. WHEN cached data is invalidated, THE API_Service SHALL serve updated data on the next request without requiring application restart
5. THE API_Service SHALL support horizontal scaling by maintaining stateless request handling with externalized session and cache storage

### Requirement 17: Reports Generation

**User Story:** As a manager, I want to generate workforce reports, so that I can analyze headcount, capacity utilization, budget variance, and organizational changes over time.

#### Acceptance Criteria

1. THE API_Service SHALL support generating reports for headcount by department, capacity utilization by squad, budget variance by department, and leave usage by period
2. WHEN a report is requested, THE API_Service SHALL enqueue it as a Background_Job and notify the requesting User upon completion
3. THE API_Service SHALL store generated reports for retrieval for a minimum of 90 days
4. THE Web_Application SHALL display a reports listing page showing report status, type, and generation date
5. WHEN a report generation Background_Job completes, THE Web_Application SHALL make the report available for download within 5 seconds of completion notification

### Requirement 18: Data Validation

**User Story:** As a developer, I want consistent data validation across frontend and backend using shared schemas, so that invalid data is caught early and validation logic is not duplicated.

#### Acceptance Criteria

1. THE API_Service SHALL validate all incoming request payloads using Zod schemas before processing
2. WHEN validation fails, THE API_Service SHALL return a 400 response with an array of field-level error messages
3. THE Web_Application SHALL use the same Zod schemas from the shared validation package for client-side form validation
4. THE API_Service SHALL reject requests containing fields not defined in the schema (no unknown field passthrough)
5. FOR ALL valid domain objects, serializing to JSON then parsing with the Zod schema SHALL produce an equivalent object (round-trip property)
