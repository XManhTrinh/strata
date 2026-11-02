import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RetentionRules = {
  anonymiseLeaversMonths: number | null;
  privateNotesMonths: number | null;
  auditLogMonths: number | null;
  stagedImportsDays: number | null;
  notificationsMonths: number | null;
};

export type Erasure = { id: string; kind: "manual" | "retention"; reason: string; at: string };

/** The workspace's retention rules, or null when the user may not see them. */
export async function getRetention(workspaceId: string): Promise<RetentionRules | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_retention")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  return {
    anonymiseLeaversMonths: data.anonymise_leavers_months,
    privateNotesMonths: data.private_notes_months,
    auditLogMonths: data.audit_log_months,
    stagedImportsDays: data.staged_imports_days,
    notificationsMonths: data.notifications_months,
  };
}

/** The latest erasures, by hand or by the retention rules. */
export async function listErasures(workspaceId: string): Promise<Erasure[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_erasures")
    .select("id, kind, reason, erased_at")
    .eq("workspace_id", workspaceId)
    .order("erased_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind as Erasure["kind"],
    reason: e.reason,
    at: e.erased_at,
  }));
}
