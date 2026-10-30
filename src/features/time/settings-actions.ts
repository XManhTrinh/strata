"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorKey } from "@/features/structure/errors";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { generateHolidays } from "./holidays";
import {
  calendarSchema,
  holidaySchema,
  policySchema,
  scheduleSchema,
  timeTypeSchema,
} from "./schemas";

type Result = { ok: true } | { ok: false; error: ErrorKey };

function revalidateTime() {
  revalidatePath("/w/[workspace]/settings", "layout");
}

function failure(
  error: { code?: string; hint?: string | null; message?: string },
  taken: ErrorKey
): FormState {
  if (error.code === "23514" && error.message?.includes("time_types_")) {
    return { status: "error", error: "timeTypeRulesInvalid" };
  }
  const key = errorKey(error, taken);
  return key === taken
    ? { status: "error", fieldErrors: { name: key } }
    : { status: "error", error: key };
}

async function nextSortOrder(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_types")
    .select("sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

export async function saveTimeType(
  workspaceId: string,
  typeId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = timeTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const t = parsed.data;
  // Rules that go together: approval needs an approver; only events repeat.
  const needsApproval = t.needsApproval && t.approver !== "none";
  const values = {
    name: t.name,
    color: t.color,
    icon: t.icon,
    uses_allowance: t.usesAllowance,
    needs_approval: needsApproval,
    is_away: t.isAway,
    visibility: t.visibility,
    paid: t.paid,
    bookable_by: t.bookableBy,
    book_for_others: t.bookForOthers,
    approver: needsApproval ? t.approver : ("none" as const),
    approver_member_id: needsApproval && t.approver === "person" ? t.approverMemberId : null,
    approver_role_id: needsApproval && t.approver === "role" ? t.approverRoleId : null,
    notify_role_id: t.notifyRoleId,
    allows_recurrence: t.allowsRecurrence && !t.usesAllowance && !needsApproval,
  };
  const supabase = await createClient();
  const { error } = typeId
    ? await supabase.from("time_types").update(values).eq("id", typeId)
    : await supabase.from("time_types").insert({
        workspace_id: workspaceId,
        sort_order: await nextSortOrder(workspaceId),
        ...values,
      });
  if (error) return failure(error, "timeTypeNameTaken");
  revalidateTime();
  return { status: "success" };
}

export async function savePolicy(
  workspaceId: string,
  policyId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = policySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const p = parsed.data;
  const values = {
    name: p.name,
    time_type_id: p.timeTypeId,
    days_per_year: p.daysPerYear,
    accrual: p.accrual,
    year_start_month: p.yearStartMonth,
    carry_over_max: p.carryOverMax,
    carry_over_expires_months: p.carryOverExpiresMonths,
    prorate_by_schedule: p.prorateBySchedule,
  };
  const supabase = await createClient();
  // The first policy for a type becomes its default.
  const { count } = await supabase
    .from("allowance_policies")
    .select("id", { count: "exact", head: true })
    .eq("time_type_id", p.timeTypeId)
    .eq("is_default", true);
  const { error } = policyId
    ? await supabase.from("allowance_policies").update(values).eq("id", policyId)
    : await supabase
        .from("allowance_policies")
        .insert({ workspace_id: workspaceId, is_default: (count ?? 0) === 0, ...values });
  if (error) return failure(error, "policyNameTaken");
  revalidateTime();
  return { status: "success" };
}

export async function saveSchedule(
  workspaceId: string,
  scheduleId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = scheduleSchema.safeParse({
    name: formData.get("name"),
    days: formData.getAll("days"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const values = {
    name: parsed.data.name,
    working_days: [...new Set(parsed.data.days)].sort(),
  };
  const supabase = await createClient();
  const { error } = scheduleId
    ? await supabase.from("work_schedules").update(values).eq("id", scheduleId)
    : await supabase.from("work_schedules").insert({ workspace_id: workspaceId, ...values });
  if (error) return failure(error, "scheduleNameTaken");
  revalidateTime();
  return { status: "success" };
}

/** Adds a calendar (and generates this year and the next two from the library) or renames one. */
export async function saveCalendar(
  workspaceId: string,
  calendarId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = calendarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  if (calendarId) {
    const { error } = await supabase
      .from("holiday_calendars")
      .update({ name: parsed.data.name })
      .eq("id", calendarId);
    if (error) return failure(error, "calendarNameTaken");
  } else {
    const { data, error } = await supabase
      .from("holiday_calendars")
      .insert({
        workspace_id: workspaceId,
        name: parsed.data.name,
        country: parsed.data.country || null,
        region: parsed.data.region || null,
        source: parsed.data.country ? "generated" : "custom",
      })
      .select("id, workspace_id, country, region")
      .single();
    if (error || !data)
      return error ? failure(error, "calendarNameTaken") : { status: "error", error: "generic" };
    const year = new Date().getFullYear();
    await generateHolidays(supabase, data, [year, year + 1, year + 2]);
  }
  revalidateTime();
  return { status: "success" };
}

/** Adds a year of holidays from the library to a generated calendar (dates it already has stay). */
export async function generateCalendarYear(calendarId: string, year: number): Promise<Result> {
  const supabase = await createClient();
  const { data: calendar } = await supabase
    .from("holiday_calendars")
    .select("id, workspace_id, country, region")
    .eq("id", z.uuid().parse(calendarId))
    .single();
  if (!calendar) return { ok: false, error: "notAllowed" };
  try {
    await generateHolidays(supabase, calendar, [z.number().int().min(2000).max(2100).parse(year)]);
  } catch {
    return { ok: false, error: "notAllowed" };
  }
  revalidateTime();
  return { ok: true };
}

/** Adds or changes a holiday by hand; such days survive regeneration. */
export async function saveHoliday(
  workspaceId: string,
  calendarId: string,
  holidayId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = holidaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const values = {
    date: parsed.data.date,
    name: parsed.data.name,
    portion: parsed.data.half ? 0.5 : 1,
    edited: true,
  };
  const supabase = await createClient();
  const { error } = holidayId
    ? await supabase.from("holidays").update(values).eq("id", holidayId)
    : await supabase
        .from("holidays")
        .insert({ workspace_id: workspaceId, calendar_id: calendarId, ...values });
  if (error) {
    return error.code === "23505"
      ? { status: "error", fieldErrors: { date: "holidayDateTaken" } }
      : { status: "error", error: errorKey(error, "generic") };
  }
  revalidateTime();
  return { status: "success" };
}

export async function deleteHoliday(holidayId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", z.uuid().parse(holidayId))
    .select("id");
  revalidateTime();
  if (error) return { ok: false, error: errorKey(error, "generic") };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}

/** Makes a schedule, calendar or policy the default (one per workspace, or per type for policies). */
export async function setTimeDefault(
  table: "work_schedules" | "holiday_calendars" | "allowance_policies",
  id: string
): Promise<Result> {
  const target = z.enum(["work_schedules", "holiday_calendars", "allowance_policies"]).parse(table);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from(target)
    .select("workspace_id")
    .eq("id", z.uuid().parse(id))
    .single();
  if (!row) return { ok: false, error: "notAllowed" };
  // Clear the old default first (one default is enforced by a unique index).
  if (target === "allowance_policies") {
    const { data: policy } = await supabase
      .from("allowance_policies")
      .select("time_type_id")
      .eq("id", id)
      .single();
    await supabase
      .from("allowance_policies")
      .update({ is_default: false })
      .eq("time_type_id", policy?.time_type_id ?? "")
      .eq("is_default", true);
  } else {
    await supabase
      .from(target)
      .update({ is_default: false })
      .eq("workspace_id", row.workspace_id)
      .eq("is_default", true);
  }
  const { error } = await supabase.from(target).update({ is_default: true }).eq("id", id);
  revalidateTime();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}
