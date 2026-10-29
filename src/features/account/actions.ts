"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Category = Database["public"]["Enums"]["notification_category"];
type Delivery = Database["public"]["Enums"]["email_delivery"];

const profileSchema = z.object({
  fullName: z.string().trim().min(1, { error: "nameRequired" }).max(200),
  timeZone: z.string().min(1, { error: "timeZoneRequired" }),
});

export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return { status: "error", error: "notAllowed" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, time_zone: parsed.data.timeZone })
    .eq("id", auth.claims.sub);
  if (error) {
    return error.message.includes("time zone")
      ? { status: "error", fieldErrors: { timeZone: "timeZoneRequired" } }
      : { status: "error", error: "generic" };
  }
  revalidatePath("/", "layout");
  return { status: "success" };
}

export async function setEmailDelivery(
  category: Category,
  delivery: Delivery
): Promise<{ ok: true } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return { ok: false, error: "notAllowed" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: auth.claims.sub, category, email_delivery: delivery },
      { onConflict: "user_id,category" }
    );
  return error ? { ok: false, error: "generic" } : { ok: true };
}
