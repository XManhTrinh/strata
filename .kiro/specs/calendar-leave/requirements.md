# Requirements Document

## Introduction

This document specifies the requirements for the Calendar and Leave module — a unified feature that combines team scheduling, calendar management, and leave/holiday management into a single cohesive experience within the Strata platform. The module replaces the existing basic leave system (`apps/api/src/leave/`) with a richer, calendar-first interface that integrates leave requests, balance tracking, configurable event types, and multi-level calendar views (individual, team, company). The feature integrates with the scalable permissions system (Authorization Engine V2) using the `feature:permission:scope` model for permission-driven access control across Employee, Manager, and HR roles.

## Glossary

- **Calendar_Module**: The unified application module that provides calendar views and leave management functionality, registered as a Feature in the Authorization Engine V2.
- **Calendar_Event**: A time-bound entry on the calendar representing leave, meetings, training, conferences, out-of-office, work-from-home, or any custom event type.
- **Leave_Request**: A specialized Calendar_Event subtype that follows an approval workflow (pending → approved/rejected → cancelled) and decreases the employee's Leave_Balance upon approval.
- **Leave_Type**: A classification of leave such as Annual, Sick, Conference, Training, Personal, Parental, Unpaid, or a company-defined custom type. Each Leave_Type has its own balance allocation.
- **Event_Type**: A configurable category for Calendar_Events (e.g., Leave, Conference, Sick Leave, Training, Meeting, Out of Office, Work From Home, Custom). Event_Types are color-coded and company-configurable.
- **Leave_Balance**: The number of available leave days an employee has for a specific Leave_Type within a specific calendar year.
- **Accrual_Policy**: A rule that defines how leave days accumulate over time (e.g., earn X days per month worked).
- **Individual_Calendar**: A personal calendar view showing the authenticated employee's own events, leave requests, and balances.
- **Team_Calendar**: A calendar view available to managers showing availability, events, and leave for all direct reports within their scope.
- **Company_Calendar**: A calendar view available to HR administrators showing all employees' events and leave across the entire company.
- **Approval_Workflow**: The process by which a Leave_Request transitions through statuses: PENDING → APPROVED, PENDING → REJECTED, APPROVED → CANCELLED.
- **Employee**: A user interacting with the calendar in a self-service capacity (book own leave, view own calendar).
- **Manager**: A user with direct reports who can view team availability, approve/reject leave, and configure event types.
- **HR_Administrator**: A user with company-wide access who can view all calendars, manage leave policies, adjust balances, and configure system-wide settings.

## Requirements

### Requirement 1: Calendar Event Management

**User Story:** As an employee, I want to create, view, edit, and delete calendar events, so that I can manage my schedule and communicate my availability to the team.

#### Acceptance Criteria

1. THE Calendar_Module SHALL store Calendar_Events with the following attributes: title, Event_Type, start date/time, end date/time, all-day flag, recurrence pattern (optional), attendees (optional), notes (optional), and visibility (personal or shared)
2. WHEN an employee creates a Calendar_Event, THE Calendar_Module SHALL validate that the start date/time is before the end date/time
3. WHEN an employee creates a Calendar_Event with recurrence, THE Calendar_Module SHALL generate individual event instances according to the specified recurrence pattern (daily, weekly, monthly, yearly) up to a configurable end date or occurrence count
4. THE Calendar_Module SHALL allow employees to edit or delete their own Calendar_Events without approval
5. WHEN a Calendar_Event is marked as shared, THE Calendar_Module SHALL make the event visible on the Team_Calendar to users with team-level calendar view permissions
6. WHEN a Calendar_Event is marked as personal, THE Calendar_Module SHALL restrict visibility to the owning employee only
7. THE Calendar_Module SHALL assign a display color to each Calendar_Event based on its associated Event_Type configuration

### Requirement 2: Configurable Event Types

**User Story:** As a manager, I want to create and manage custom event types for my organization, so that the calendar reflects our specific scheduling categories beyond the defaults.

#### Acceptance Criteria

1. THE Calendar_Module SHALL provide the following default Event_Types upon feature enablement for a company: Leave, Conference, Sick Leave, Training, Meeting, Out of Office, and Work From Home
2. WHEN a manager creates a new Event_Type, THE Calendar_Module SHALL store it with a name, color code, icon (optional), description (optional), and active/archived status scoped to the company
3. THE Calendar_Module SHALL NOT impose a maximum limit on the number of custom Event_Types a company can create
4. WHEN an Event_Type is archived, THE Calendar_Module SHALL prevent creation of new Calendar_Events with that type while preserving existing events of that type
5. THE Calendar_Module SHALL validate that Event_Type names are unique within a company
6. WHEN an Event_Type is modified (name, color, or icon), THE Calendar_Module SHALL reflect the updated appearance on all existing Calendar_Events of that type without requiring event re-creation
7. THE Calendar_Module SHALL restrict Event_Type creation and management to users with the `calendar:manage_event_types` permission

### Requirement 3: Leave Request Submission

**User Story:** As an employee, I want to submit leave requests directly from the calendar interface, so that I can book time off without navigating to a separate module.

#### Acceptance Criteria

1. WHEN an employee submits a Leave_Request, THE Calendar_Module SHALL create a Calendar_Event with the Leave_Request details and set its status to PENDING
2. THE Calendar_Module SHALL require the following attributes for a Leave_Request: Leave_Type, start date, end date, and optional notes
3. WHEN a Leave_Request is submitted, THE Calendar_Module SHALL validate that the employee has sufficient Leave_Balance for the requested Leave_Type and duration
4. IF the employee has insufficient Leave_Balance for the requested Leave_Type, THEN THE Calendar_Module SHALL reject the submission and return a descriptive error indicating the available balance and the shortfall
5. WHEN a Leave_Request overlaps with an existing approved Leave_Request for the same employee, THE Calendar_Module SHALL reject the submission and return a descriptive error identifying the conflicting request
6. WHEN a Leave_Request is successfully submitted, THE Calendar_Module SHALL notify the employee's direct manager via the notification system
7. THE Calendar_Module SHALL restrict Leave_Request submission to users with the `calendar:submit_leave` permission

### Requirement 4: Leave Request Approval Workflow

**User Story:** As a manager, I want to review, approve, or reject leave requests from my team members, so that I can manage team availability and ensure adequate coverage.

#### Acceptance Criteria

1. WHEN a manager views the Team_Calendar, THE Calendar_Module SHALL display all pending Leave_Requests from direct reports with a distinct visual indicator (dashed border or reduced opacity)
2. WHEN a manager approves a Leave_Request, THE Calendar_Module SHALL transition the request status from PENDING to APPROVED and deduct the corresponding days from the employee's Leave_Balance
3. WHEN a manager rejects a Leave_Request, THE Calendar_Module SHALL transition the request status from PENDING to REJECTED without modifying the employee's Leave_Balance
4. WHEN a Leave_Request status changes to APPROVED or REJECTED, THE Calendar_Module SHALL notify the requesting employee via the notification system
5. THE Calendar_Module SHALL support only the following status transitions: PENDING to APPROVED, PENDING to REJECTED, and APPROVED to CANCELLED
6. IF a status transition is invalid, THEN THE Calendar_Module SHALL reject the operation and return a descriptive error listing the valid transitions from the current status
7. THE Calendar_Module SHALL restrict approval and rejection actions to users with the `calendar:approve_leave` permission and appropriate scope (DIRECT_REPORTS, ORGANIZATION_UNIT, BRANCH, or COMPANY)
8. WHEN a Leave_Request is cancelled after approval, THE Calendar_Module SHALL restore the deducted days to the employee's Leave_Balance

### Requirement 5: Leave Balance Management

**User Story:** As an employee, I want to see my remaining leave balance at a glance, so that I know how many days I have available for each leave type before booking time off.

#### Acceptance Criteria

1. THE Calendar_Module SHALL maintain a Leave_Balance record for each employee per Leave_Type per calendar year
2. WHEN a Leave_Request is approved, THE Calendar_Module SHALL deduct the number of working days from the employee's Leave_Balance for the corresponding Leave_Type and year
3. WHEN an employee views the Individual_Calendar, THE Calendar_Module SHALL display the remaining Leave_Balance for each Leave_Type in a summary panel
4. THE Calendar_Module SHALL calculate working days by excluding weekends (Saturday and Sunday) from the leave duration count
5. WHEN the Leave_Balance for a Leave_Type reaches zero, THE Calendar_Module SHALL still allow submission of Leave_Requests of that type but SHALL flag them as exceeding the balance in the approval interface for the manager
6. THE Calendar_Module SHALL prevent Leave_Balance values from becoming negative through approved requests — if approval would result in a negative balance, THE Calendar_Module SHALL warn the approver and require explicit confirmation

### Requirement 6: Leave Balance Administration

**User Story:** As an HR administrator, I want to configure leave allocations, adjust individual balances, and set accrual policies, so that I can manage the organization's leave entitlements according to company policy.

#### Acceptance Criteria

1. THE Calendar_Module SHALL allow HR_Administrators to set the initial annual Leave_Balance allocation for each Leave_Type at the company level
2. THE Calendar_Module SHALL allow HR_Administrators to manually adjust an individual employee's Leave_Balance for any Leave_Type with a mandatory reason field for audit purposes
3. WHEN an HR_Administrator adjusts a Leave_Balance, THE Calendar_Module SHALL create an Audit_Record capturing the previous balance, new balance, adjustment reason, and the acting administrator
4. THE Calendar_Module SHALL support Accrual_Policies that define monthly accrual amounts per Leave_Type (e.g., earn 1.5 days of Annual leave per month)
5. WHEN an Accrual_Policy is active, THE Calendar_Module SHALL automatically increment the employee's Leave_Balance on the first day of each month by the configured accrual amount
6. THE Calendar_Module SHALL restrict balance administration to users with the `calendar:manage_balances` permission at COMPANY scope
7. THE Calendar_Module SHALL support configuring whether unused Leave_Balance carries over to the next calendar year or expires, per Leave_Type

### Requirement 7: Individual Calendar View

**User Story:** As an employee, I want a personal calendar view showing my events, leave requests, and availability, so that I can manage my schedule from a single interface.

#### Acceptance Criteria

1. WHEN an employee accesses the Individual_Calendar, THE Calendar_Module SHALL display all Calendar_Events and Leave_Requests belonging to that employee
2. THE Calendar_Module SHALL render the Individual_Calendar with day, week, and month view options
3. THE Calendar_Module SHALL color-code all displayed events according to their Event_Type configuration
4. THE Calendar_Module SHALL display pending Leave_Requests with a distinct visual style (dashed border or reduced opacity) to differentiate them from approved events
5. WHEN an employee clicks on a date or time slot in the Individual_Calendar, THE Calendar_Module SHALL present options to create either a Calendar_Event or a Leave_Request
6. THE Calendar_Module SHALL restrict access to the Individual_Calendar to users with the `calendar:view_own` permission

### Requirement 8: Team Calendar View

**User Story:** As a manager, I want a team calendar showing my direct reports' availability, approved leave, and pending requests, so that I can plan work allocation and identify scheduling conflicts.

#### Acceptance Criteria

1. WHEN a manager accesses the Team_Calendar, THE Calendar_Module SHALL display Calendar_Events and Leave_Requests for all users within the manager's authorized scope (DIRECT_REPORTS, ORGANIZATION_UNIT, or BRANCH)
2. THE Calendar_Module SHALL render the Team_Calendar with week and month view options, with each team member displayed as a separate row or swimlane
3. THE Calendar_Module SHALL display approved Leave_Requests as solid calendar blocks and pending Leave_Requests as visually distinct blocks (dashed border or reduced opacity)
4. THE Calendar_Module SHALL display a team availability summary showing the count of team members available versus on leave for each day
5. WHEN a manager views the Team_Calendar, THE Calendar_Module SHALL provide quick-action controls to approve or reject pending Leave_Requests directly from the calendar view
6. THE Calendar_Module SHALL restrict access to the Team_Calendar to users with the `calendar:view_team` permission at the appropriate scope

### Requirement 9: Company Calendar View

**User Story:** As an HR administrator, I want a company-wide calendar view showing all employees' leave and events, so that I can monitor organization-wide availability and manage workforce planning.

#### Acceptance Criteria

1. WHEN an HR_Administrator accesses the Company_Calendar, THE Calendar_Module SHALL display Calendar_Events and Leave_Requests for all employees within the company
2. THE Calendar_Module SHALL support filtering the Company_Calendar by Organization_Unit, Leave_Type, Event_Type, and employee name
3. THE Calendar_Module SHALL display aggregate statistics including total employees on leave per day, breakdown by Leave_Type, and trending patterns
4. THE Calendar_Module SHALL render the Company_Calendar with month and year overview options optimized for viewing large numbers of employees
5. WHEN the Company_Calendar displays more than 50 employees, THE Calendar_Module SHALL use virtualization or pagination to maintain rendering performance
6. THE Calendar_Module SHALL restrict access to the Company_Calendar to users with the `calendar:view_company` permission at COMPANY scope

### Requirement 10: Leave Type Configuration

**User Story:** As an HR administrator, I want to configure leave types including custom types with their own balances and policies, so that the system reflects our organization's specific leave entitlement structure.

#### Acceptance Criteria

1. THE Calendar_Module SHALL provide the following default Leave_Types upon feature enablement: Annual, Sick, Conference, Training, Personal, Parental, and Unpaid
2. THE Calendar_Module SHALL allow HR_Administrators to create custom Leave_Types with a name, default annual allocation, color code, requires-approval flag, and active/archived status
3. WHEN a Leave_Type has `requires-approval` set to false, THE Calendar_Module SHALL automatically approve Leave_Requests of that type upon submission without manager intervention
4. THE Calendar_Module SHALL validate that Leave_Type names are unique within a company
5. WHEN a Leave_Type is archived, THE Calendar_Module SHALL prevent new Leave_Requests of that type while preserving existing requests and historical balance records
6. THE Calendar_Module SHALL restrict Leave_Type configuration to users with the `calendar:manage_policies` permission at COMPANY scope

### Requirement 11: Permission Integration

**User Story:** As a platform administrator, I want the calendar-leave module to integrate with the scalable permissions system, so that access to calendar features is controlled through the standard role-based authorization model.

#### Acceptance Criteria

1. WHEN the Calendar_Module is deployed, THE Calendar_Module SHALL self-register with the Feature Registry providing the feature key `calendar` and the following Feature_Permissions: `view_own`, `view_team`, `view_company`, `submit_leave`, `approve_leave`, `manage_balances`, `manage_policies`, `manage_event_types`
2. WHEN a user performs any calendar action, THE Calendar_Module SHALL evaluate the request through the Authorization_Engine using the `calendar:{permission}:{scope}` pattern before allowing the operation
3. WHEN the Authorization_Engine denies a calendar action, THE Calendar_Module SHALL return a 403 Forbidden response with a non-specific error message
4. THE Calendar_Module SHALL respect Permission_Scope boundaries: OWN scope restricts to the user's own data, DIRECT_REPORTS scope includes direct reports' data, ORGANIZATION_UNIT scope includes all users in the same unit, BRANCH scope includes all descendant units, and COMPANY scope includes all company employees
5. WHEN a Company disables the Calendar feature via Company_Feature configuration, THE Authorization_Engine SHALL deny all calendar actions for users in that Company

### Requirement 12: Leave Request and Calendar Event Integration

**User Story:** As an employee, I want my approved leave to appear automatically on the calendar and be visible to my team, so that scheduling is unified and nobody needs to check a separate leave system.

#### Acceptance Criteria

1. WHEN a Leave_Request is approved, THE Calendar_Module SHALL display it as a solid Calendar_Event on the Individual_Calendar and the Team_Calendar visible to authorized viewers
2. WHEN a Leave_Request is pending, THE Calendar_Module SHALL display it on the Individual_Calendar with a pending visual indicator and on the Team_Calendar only for users with approval permissions
3. WHEN a Leave_Request is rejected, THE Calendar_Module SHALL remove it from calendar views or display it with a struck-through visual indicator on the Individual_Calendar only
4. WHEN a Leave_Request is cancelled, THE Calendar_Module SHALL remove the corresponding Calendar_Event from all calendar views
5. THE Calendar_Module SHALL NOT allow direct editing of Calendar_Events that are linked to a Leave_Request — modifications to leave must go through the Leave_Request workflow

### Requirement 13: Calendar Event Recurrence

**User Story:** As an employee, I want to create recurring calendar events (e.g., weekly team meetings, monthly training), so that I do not need to manually create repetitive entries.

#### Acceptance Criteria

1. THE Calendar_Module SHALL support the following recurrence patterns: daily, weekly (on specified days), monthly (on a specified date or nth weekday), and yearly
2. WHEN a recurring Calendar_Event is created, THE Calendar_Module SHALL generate individual event instances up to a maximum of 365 days in advance or the specified end date, whichever is sooner
3. WHEN an employee edits a single instance of a recurring event, THE Calendar_Module SHALL offer the option to edit only that instance or all future instances
4. WHEN an employee deletes a recurring event, THE Calendar_Module SHALL offer the option to delete only that instance, that instance and all future instances, or all instances
5. THE Calendar_Module SHALL NOT support recurrence for Leave_Request events — each leave period must be submitted individually

### Requirement 14: Notifications and Alerts

**User Story:** As a manager, I want to receive timely notifications when team members submit leave requests, so that I can respond to approval requests promptly.

#### Acceptance Criteria

1. WHEN a Leave_Request is submitted, THE Calendar_Module SHALL create a notification for the employee's direct manager with the leave details and a link to the approval interface
2. WHEN a Leave_Request is approved or rejected, THE Calendar_Module SHALL create a notification for the requesting employee with the decision and any notes from the manager
3. WHEN a Leave_Request is cancelled, THE Calendar_Module SHALL create a notification for the employee's direct manager indicating the cancellation
4. WHEN an employee's Leave_Balance falls below 3 days for any Leave_Type, THE Calendar_Module SHALL display a warning indicator on the Individual_Calendar balance summary
5. THE Calendar_Module SHALL enqueue all notifications as Background_Jobs to avoid blocking the primary request flow

### Requirement 15: Audit Trail

**User Story:** As an HR administrator, I want all leave and balance changes to be fully auditable, so that I can investigate disputes and maintain compliance records.

#### Acceptance Criteria

1. WHEN a Leave_Request is created, approved, rejected, or cancelled, THE Calendar_Module SHALL create an Audit_Record capturing the actor, previous status, new status, and timestamp
2. WHEN a Leave_Balance is adjusted manually, THE Calendar_Module SHALL create an Audit_Record capturing the administrator, previous balance, new balance, adjustment reason, and timestamp
3. WHEN an Accrual_Policy is created or modified, THE Calendar_Module SHALL create an Audit_Record capturing the actor, previous configuration, new configuration, and timestamp
4. WHEN an Event_Type or Leave_Type is created, archived, or modified, THE Calendar_Module SHALL create an Audit_Record capturing the change details
5. THE Calendar_Module SHALL retain all Audit_Records for a minimum of 7 years in compliance with the platform's audit retention policy

### Requirement 16: Data Migration from Existing Leave Module

**User Story:** As a platform engineer, I want a clear migration path from the existing basic leave module to the new calendar-leave module, so that existing leave requests and history are preserved.

#### Acceptance Criteria

1. THE Calendar_Module SHALL provide a migration utility that converts existing LeaveRequest records into Calendar_Event and Leave_Request records in the new schema
2. WHEN the migration utility is executed, THE Calendar_Module SHALL preserve all existing leave request statuses, dates, types, and associated audit records
3. THE migration utility SHALL map existing LeaveType enum values (ANNUAL, SICK, PERSONAL, PARENTAL, UNPAID) to corresponding Leave_Type records in the new configurable type system
4. THE migration utility SHALL generate a report listing all migrated records, any unmapped data, and conflicts detected during migration
5. WHEN migration is complete, THE Calendar_Module SHALL maintain backward-compatible API endpoints at the existing leave module paths for a deprecation period of 90 days

