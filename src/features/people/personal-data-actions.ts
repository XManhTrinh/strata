"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { retentionSchema } from "./schemas";

/** Erases a person in one step (the database checks the permission and keeps a record). */
export async function erasePerson(
  memberId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("erase_member", { p_member_id: memberId, p_reason: reason });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidatePath("/w/[workspace]", "layout");
  return { ok: true };
}

/** Saves the workspace's retention rules (RLS lets only personal data managers change them). */
export async function saveRetention(
  workspaceId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = retentionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const r = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_retention")
    .update({
      anonymise_leavers_months: r.anonymiseLeaversMonths,
      private_notes_months: r.privateNotesMonths,
      audit_log_months: r.auditLogMonths,
      staged_imports_days: r.stagedImportsDays,
      notifications_months: r.notificationsMonths,
    })
    .eq("workspace_id", workspaceId)
    .select("workspace_id");
  if (error) return { status: "error", error: errorKey(error, "generic") };
  if (!data?.length) return { status: "error", error: "notAllowed" };
  revalidatePath("/w/[workspace]/settings", "layout");
  return { status: "success" };
}
