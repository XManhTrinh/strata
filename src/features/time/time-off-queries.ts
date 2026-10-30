import "server-only";
import { createClient } from "@/lib/supabase/server";
import { occurrences } from "./recurrence";
import type { Balance, BookableType, CalendarEntry, MyBooking, PendingApproval } from "./types";

/** The caller's member id in a workspace, or null. */
export async function myMemberId(workspaceId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth?.claims.sub ?? "")
    .maybeSingle();
  return data?.id ?? null;
}

export async function myBalances(memberId: string): Promise<Balance[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("allowance_balances", { p_member_id: memberId });
  return (data ?? []).map((b) => ({
    timeTypeId: b.time_type_id,
    name: b.time_type_name,
    leaveYear: b.leave_year,
    entitled: Number(b.entitled),
    carriedOver: Number(b.carried_over),
    adjusted: Number(b.adjusted),
    used: Number(b.used),
    requested: Number(b.requested),
    expired: Number(b.expired),
    available: Number(b.available),
  }));
}

/** The caller's bookings from 90 days ago onwards, newest first. */
export async function myBookings(workspaceId: string, memberId: string): Promise<MyBooking[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("booking_attendees")
    .select(
      "working_days, bookings!inner(id, start_date, end_date, start_half, end_half, status, title, time_types(name, color, icon))"
    )
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .gte("bookings.end_date", since)
    .order("start_date", { referencedTable: "bookings", ascending: false })
    .limit(100);
  return (data ?? [])
    .map((a) => ({
      id: a.bookings.id,
      typeName: a.bookings.time_types?.name ?? "",
      color: a.bookings.time_types?.color ?? "#757575",
      icon: a.bookings.time_types?.icon ?? "event",
      startDate: a.bookings.start_date,
      endDate: a.bookings.end_date,
      startHalf: a.bookings.start_half,
      endHalf: a.bookings.end_half,
      status: a.bookings.status,
      workingDays: Number(a.working_days),
      title: a.bookings.title,
    }))
    .sort((x, y) => y.startDate.localeCompare(x.startDate));
}

/** Time types the caller may book (for themselves; booking for others is checked when booking). */
export async function bookableTypes(workspaceId: string): Promise<BookableType[]> {
  const supabase = await createClient();
  const [{ data: types }, { data: permissions }] = await Promise.all([
    supabase
      .from("time_types")
      .select(
        "id, name, color, icon, uses_allowance, needs_approval, book_for_others, bookable_by, allows_recurrence"
      )
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase.rpc("my_permissions", { p_workspace_id: workspaceId }),
  ]);
  const held = new Set((permissions ?? []).map((p) => p.permission_key));
  return (types ?? [])
    .filter(
      (t) =>
        t.bookable_by === "everyone" ||
        (t.bookable_by === "managers" && held.has("time.approve")) ||
        (t.bookable_by === "admins" && held.has("time.manage_settings"))
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      icon: t.icon,
      usesAllowance: t.uses_allowance,
      needsApproval: t.needs_approval,
      bookForOthers: t.book_for_others,
      allowsRecurrence: t.allows_recurrence,
    }));
}

export async function pendingApprovals(workspaceId: string): Promise<PendingApproval[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_pending_approvals", { p_workspace_id: workspaceId });
  return (data ?? []).map((p) => ({
    bookingId: p.booking_id,
    memberName: p.member_name,
    typeName: p.time_type_name,
    color: p.color,
    startDate: p.start_date,
    endDate: p.end_date,
    startHalf: p.start_half,
    endHalf: p.end_half,
    workingDays: Number(p.working_days),
    notes: p.notes,
  }));
}

export async function calendarEntries(
  workspaceId: string,
  from: string,
  to: string
): Promise<CalendarEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("calendar_entries", {
    p_workspace_id: workspaceId,
    p_from: from,
    p_to: to,
  });
  // Repeating events come once with their rule; each occurrence in the range becomes an entry.
  return (data ?? []).flatMap((e) =>
    occurrences(
      { startDate: e.start_date, endDate: e.end_date, recurrenceRule: e.recurrence_rule },
      from,
      to
    ).map((o) => ({
      bookingId: e.booking_id,
      memberId: e.member_id,
      memberName: e.member_name,
      typeName: e.time_type_name,
      color: e.color,
      icon: e.icon,
      isAway: e.is_away,
      startDate: o.startDate,
      endDate: o.endDate,
      startHalf: e.start_half,
      endHalf: e.end_half,
      status: e.status,
      title: e.title,
      masked: e.masked,
      repeats: e.recurrence_rule !== null,
    }))
  );
}

export type FeedLink = {
  id: string;
  scope: "me" | "team" | "workspace";
  createdAt: string;
  lastUsedAt: string | null;
};

/** The caller's own feed links in a workspace (RLS shows only theirs). */
export async function myFeeds(workspaceId: string): Promise<FeedLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_feed_tokens")
    .select("id, scope, created_at, last_used_at")
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id,
    scope: f.scope,
    createdAt: f.created_at,
    lastUsedAt: f.last_used_at,
  }));
}
