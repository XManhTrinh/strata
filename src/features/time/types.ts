import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type TimeType = {
  id: string;
  name: string;
  color: string;
  icon: string;
  usesAllowance: boolean;
  needsApproval: boolean;
  isAway: boolean;
  visibility: Enums["time_visibility"];
  paid: boolean;
  bookableBy: Enums["time_bookable_by"];
  bookForOthers: boolean;
  approver: Enums["time_approver"];
  approverMemberId: string | null;
  approverMemberName: string | null;
  approverRoleId: string | null;
  notifyRoleId: string | null;
  allowsRecurrence: boolean;
  archived: boolean;
};

export type AllowancePolicy = {
  id: string;
  timeTypeId: string;
  name: string;
  daysPerYear: number;
  accrual: Enums["allowance_accrual"];
  yearStartMonth: number;
  carryOverMax: number | null;
  carryOverExpiresMonths: number | null;
  prorateBySchedule: boolean;
  isDefault: boolean;
  archived: boolean;
};

export type WorkSchedule = {
  id: string;
  name: string;
  workingDays: number[];
  isDefault: boolean;
  archived: boolean;
};

export type HolidayCalendar = {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  source: "generated" | "custom";
  isDefault: boolean;
  archived: boolean;
  /** The last year with any holiday, so the screen can say how far the calendar reaches. */
  lastYear: number | null;
};

export type Holiday = {
  id: string;
  calendarId: string;
  date: string;
  name: string;
  portion: number;
  edited: boolean;
};

export type RoleChoice = { id: string; name: string };

export type Balance = {
  timeTypeId: string;
  name: string;
  leaveYear: string;
  entitled: number;
  carriedOver: number;
  adjusted: number;
  used: number;
  requested: number;
  expired: number;
  available: number;
};

export type MyBooking = {
  id: string;
  typeName: string;
  color: string;
  icon: string;
  startDate: string;
  endDate: string;
  startHalf: string;
  endHalf: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  workingDays: number;
  title: string | null;
};

export type BookableType = {
  id: string;
  name: string;
  color: string;
  icon: string;
  usesAllowance: boolean;
  needsApproval: boolean;
  bookForOthers: boolean;
  allowsRecurrence: boolean;
};

export type PendingApproval = {
  bookingId: string;
  memberName: string;
  typeName: string;
  color: string;
  startDate: string;
  endDate: string;
  startHalf: string;
  endHalf: string;
  workingDays: number;
  notes: string | null;
};

export type CalendarEntry = {
  bookingId: string;
  memberId: string;
  memberName: string;
  typeName: string | null;
  color: string;
  icon: string;
  isAway: boolean;
  startDate: string;
  endDate: string;
  startHalf: string;
  endHalf: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  title: string | null;
  masked: boolean;
  /** One occurrence of a repeating event. */
  repeats: boolean;
};
