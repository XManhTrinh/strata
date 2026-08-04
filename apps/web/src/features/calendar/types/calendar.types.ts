export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type EventVisibility = "PERSONAL" | "SHARED";

export interface EventType {
  id: string;
  companyId: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  isSystem: boolean;
  archivedAt?: string | null;
}

export interface LeaveTypeConfig {
  id: string;
  companyId: string;
  name: string;
  color: string;
  defaultAllocation: number;
  requiresApproval: boolean;
  carryOver: boolean;
  maxCarryOverDays?: number | null;
  isSystem: boolean;
  archivedAt?: string | null;
}

export interface CalendarEvent {
  id: string;
  companyId: string;
  ownerUserId: string;
  ownerName: string;
  eventTypeId: string;
  eventType: EventType;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  visibility: EventVisibility;
  notes?: string;
  isRecurring: boolean;
  recurrenceMasterId?: string | null;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number | null;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
  leaveRequest?: CalendarLeaveRequest | null;
}

export interface CalendarLeaveRequest {
  id: string;
  calendarEventId: string;
  leaveTypeId: string;
  leaveType: LeaveTypeConfig;
  status: LeaveRequestStatus;
  workingDays: number;
  reviewerId?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
}

export interface LeaveBalance {
  id: string;
  companyId: string;
  userId: string;
  leaveTypeId: string;
  leaveType: LeaveTypeConfig;
  year: number;
  allocated: number;
  used: number;
  adjustment: number;
  carriedOver: number;
}

export interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  orgUnitId: string;
  orgUnitName: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  members: TeamMember[];
}

export interface AccessibleScope {
  orgUnits: OrgUnit[];
  totalPeople: number;
}

export type ViewMode = "month" | "week";

export interface CalendarFilter {
  orgUnitIds: string[];
  userIds: string[];
  eventTypeIds: string[];
  leaveTypeIds: string[];
}
