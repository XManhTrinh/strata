/** Notification kinds the app has text for; anything else reads "Something changed". */
const NOTIFICATION_KINDS = [
  "role.assigned",
  "role.removed",
  "ownership.received",
  "invitation.received",
  "invitation.accepted",
  "time.requested",
  "time.reminder",
  "time.booked_for_you",
  "time.booked",
  "time.approved",
  "time.rejected",
  "time.cancelled",
  "import.finished",
  "scenario.submitted",
  "scenario.approved",
  "scenario.returned",
] as const;

/**
 * The message key and values for a notification, shared by the bell and the emails. `day` formats
 * a date-only value (the payload's dates are plain days, not moments).
 */
export function notificationMessage(
  kind: string,
  payload: unknown,
  day: (iso: string) => string
): { key: `kinds.${string}`; values: Record<string, string> } {
  const p = (payload ?? {}) as Record<string, string | undefined>;
  const known = (NOTIFICATION_KINDS as readonly string[]).includes(kind) ? kind : "unknown";
  const start = p.start_date ? day(p.start_date) : "";
  const end = p.end_date ? day(p.end_date) : "";
  return {
    key: `kinds.${known}`,
    values: {
      role: p.role_name ?? "",
      workspace: p.workspace_name ?? "",
      name: p.member_name ?? "",
      by: p.by_name ?? "",
      type: p.time_type ?? "",
      scenario: p.scenario_name ?? "",
      dates: start === end ? start : `${start} – ${end}`,
    },
  };
}
