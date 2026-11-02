/** Notification kinds the app has text for; anything else reads "Something changed". */
const NOTIFICATION_KINDS = [
  "role.assigned",
  "role.removed",
  "ownership.received",
  "invitation.received",
  "invitation.accepted",
  "join.requested",
  "join.approved",
  "join.declined",
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

/**
 * Where a notification leads, inside its workspace ("" for the workspace's home), or null when
 * there's nowhere to go (a declined request to join). Shared by the bell and the emails.
 */
export function notificationPath(kind: string, payload: unknown): string | null {
  const p = (payload ?? {}) as Record<string, string | undefined>;
  if (kind === "time.requested" || kind === "time.reminder") return "/time-off?tab=approvals";
  if (kind.startsWith("time.")) return "/time-off?tab=mine";
  if (kind.startsWith("scenario.")) {
    return p.scenario_id ? `/planning/scenarios/${p.scenario_id}` : "/planning/scenarios";
  }
  if (kind === "import.finished") return "/people";
  if (kind === "join.requested" || kind === "invitation.accepted") return "/settings/members";
  if (kind === "join.declined" || kind === "invitation.received") return null;
  return "";
}

/** The icon for a notification: what kind of thing happened, at a glance. */
export function notificationIcon(kind: string): string {
  if (kind === "time.requested" || kind === "time.reminder") return "pending_actions";
  if (kind === "time.rejected" || kind === "time.cancelled") return "event_busy";
  if (kind.startsWith("time.")) return "event_available";
  if (kind.startsWith("join.") || kind.startsWith("invitation.")) return "person_add";
  if (kind.startsWith("role.") || kind === "ownership.received") return "admin_panel_settings";
  if (kind.startsWith("scenario.")) return "insights";
  if (kind === "import.finished") return "upload_file";
  return "notifications";
}
