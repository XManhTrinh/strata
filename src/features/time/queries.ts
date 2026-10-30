import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AllowancePolicy,
  Holiday,
  HolidayCalendar,
  RoleChoice,
  TimeType,
  WorkSchedule,
} from "./types";

/** Everything the time settings screens edit, archived entries included. */
export async function listTimeSettings(workspaceId: string): Promise<{
  types: TimeType[];
  policies: AllowancePolicy[];
  schedules: WorkSchedule[];
  calendars: HolidayCalendar[];
  roles: RoleChoice[];
}> {
  const supabase = await createClient();
  const [types, policies, schedules, calendars, lastDates, roles] = await Promise.all([
    supabase
      .from("time_types")
      .select(
        "*, approver_member:members!time_types_workspace_id_approver_member_id_fkey(full_name)"
      )
      .eq("workspace_id", workspaceId)
      .order("sort_order")
      .order("name"),
    supabase.from("allowance_policies").select("*").eq("workspace_id", workspaceId).order("name"),
    supabase.from("work_schedules").select("*").eq("workspace_id", workspaceId).order("name"),
    supabase.from("holiday_calendars").select("*").eq("workspace_id", workspaceId).order("name"),
    supabase
      .from("holidays")
      .select("calendar_id, date")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("roles")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("name"),
  ]);
  const lastYear = new Map<string, number>();
  for (const h of lastDates.data ?? []) {
    if (!lastYear.has(h.calendar_id)) lastYear.set(h.calendar_id, Number(h.date.slice(0, 4)));
  }
  return {
    types: (types.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      icon: t.icon,
      usesAllowance: t.uses_allowance,
      needsApproval: t.needs_approval,
      isAway: t.is_away,
      visibility: t.visibility,
      paid: t.paid,
      bookableBy: t.bookable_by,
      bookForOthers: t.book_for_others,
      approver: t.approver,
      approverMemberId: t.approver_member_id,
      approverMemberName: t.approver_member?.full_name ?? null,
      approverRoleId: t.approver_role_id,
      notifyRoleId: t.notify_role_id,
      allowsRecurrence: t.allows_recurrence,
      archived: t.archived_at !== null,
    })),
    policies: (policies.data ?? []).map((p) => ({
      id: p.id,
      timeTypeId: p.time_type_id,
      name: p.name,
      daysPerYear: Number(p.days_per_year),
      accrual: p.accrual,
      yearStartMonth: p.year_start_month,
      carryOverMax: p.carry_over_max === null ? null : Number(p.carry_over_max),
      carryOverExpiresMonths: p.carry_over_expires_months,
      prorateBySchedule: p.prorate_by_schedule,
      isDefault: p.is_default,
      archived: p.archived_at !== null,
    })),
    schedules: (schedules.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      workingDays: s.working_days,
      isDefault: s.is_default,
      archived: s.archived_at !== null,
    })),
    calendars: (calendars.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      region: c.region,
      source: c.source as HolidayCalendar["source"],
      isDefault: c.is_default,
      archived: c.archived_at !== null,
      lastYear: lastYear.get(c.id) ?? null,
    })),
    roles: roles.data ?? [],
  };
}

export async function listHolidays(calendarId: string, year: number): Promise<Holiday[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holidays")
    .select("id, calendar_id, date, name, portion, edited")
    .eq("calendar_id", calendarId)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date");
  return (data ?? []).map((h) => ({
    id: h.id,
    calendarId: h.calendar_id,
    date: h.date,
    name: h.name,
    portion: Number(h.portion),
    edited: h.edited,
  }));
}
