"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorKey } from "@/features/structure/errors";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: ErrorKey };

const bookingSchema = z.object({
  timeTypeId: z.uuid({ error: "timeTypeRequired" }),
  memberId: z.uuid(),
  startDate: z.iso.date({ error: "dateRequired" }),
  endDate: z.iso.date({ error: "dateRequired" }),
  startHalf: z.enum(["full", "afternoon"]).default("full"),
  endHalf: z.enum(["full", "morning"]).default("full"),
  title: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(2000).default(""),
});

function revalidateTime() {
  revalidatePath("/w/[workspace]", "layout");
}

export async function bookTime(
  workspaceId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return {
      status: "error",
      fieldErrors: { [field]: (parsed.error.issues[0]?.message ?? "generic") as ErrorKey },
    };
  }
  const b = parsed.data;
  if (b.endDate < b.startDate)
    return { status: "error", fieldErrors: { endDate: "endBeforeStart" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_time", {
    p_workspace_id: workspaceId,
    p_time_type_id: b.timeTypeId,
    p_member_ids: [b.memberId],
    p_start_date: b.startDate,
    p_end_date: b.endDate,
    p_start_half: b.startHalf,
    p_end_half: b.endHalf,
    p_title: b.title || undefined,
    p_notes: b.notes || undefined,
  });
  if (error) return { status: "error", error: errorKey(error, "generic") };
  revalidateTime();
  return { status: "success" };
}

export async function decideBooking(
  bookingId: string,
  approve: boolean,
  comment: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_booking", {
    p_booking_id: z.uuid().parse(bookingId),
    p_approve: approve,
    p_comment: comment.slice(0, 1000) || undefined,
  });
  revalidateTime();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: z.uuid().parse(bookingId),
  });
  revalidateTime();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}

/** Working days a booking would take, for the booking dialog. */
export async function previewWorkingDays(
  memberId: string,
  start: string,
  startHalf: string,
  end: string,
  endHalf: string
): Promise<number | null> {
  if (!z.iso.date().safeParse(start).success || !z.iso.date().safeParse(end).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("preview_working_days", {
    p_member_id: z.uuid().parse(memberId),
    p_start: start,
    p_start_half: startHalf,
    p_end: end,
    p_end_half: endHalf,
  });
  return data === null || data === undefined ? null : Number(data);
}
