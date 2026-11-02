"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import type { ErrorKey } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

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
