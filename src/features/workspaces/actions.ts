"use server";

import { redirect } from "next/navigation";
import { type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { generateHolidays } from "@/features/time/holidays";
import { createClient } from "@/lib/supabase/server";
import { createWorkspaceSchema } from "./schemas";

export async function createWorkspace(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = createWorkspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const input = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: input.name,
    p_slug: input.slug,
    p_template_key: input.template,
    p_country: input.country,
    p_time_zone: input.timeZone,
    p_currency: input.currency,
    p_fiscal_year_start_month: input.fiscalYearStartMonth,
    p_week_start: input.weekStart,
  });

  if (error) {
    // 23505: address taken; 23514 on the slug check: reserved name.
    if (error.code === "23505" || error.message.includes("workspaces_slug_check")) {
      return { status: "error", fieldErrors: { slug: "slugUnavailable" } };
    }
    if (error.message.includes("time zone")) {
      return { status: "error", fieldErrors: { timeZone: "timeZoneRequired" } };
    }
    return { status: "error", error: "generic" };
  }

  // The default holiday calendar gets this year and the next two (best effort: settings can
  // generate them later).
  const { data: calendar } = await supabase
    .from("holiday_calendars")
    .select("id, workspace_id, country, region")
    .eq("workspace_id", data.id)
    .eq("is_default", true)
    .maybeSingle();
  if (calendar) {
    const year = new Date().getFullYear();
    await generateHolidays(supabase, calendar, [year, year + 1, year + 2]).catch(() => 0);
  }

  redirect(`/w/${data.slug}`);
}
