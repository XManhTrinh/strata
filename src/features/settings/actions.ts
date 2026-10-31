"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { workspaceSettingsSchema } from "./schemas";

export async function updateWorkspaceSettings(
  workspaceId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = workspaceSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const input = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .single();
  // RLS lets only people with workspace.manage_settings update; otherwise no row comes back.
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      name: input.name,
      slug: input.slug,
      country: input.country,
      time_zone: input.timeZone,
      currency: input.currency,
      fiscal_year_start_month: input.fiscalYearStartMonth,
      week_start: input.weekStart,
    })
    .eq("id", workspaceId)
    .select("slug")
    .maybeSingle();

  if (error) {
    if (error.code === "23505" || error.message.includes("workspaces_slug_check")) {
      return { status: "error", fieldErrors: { slug: "slugUnavailable" } };
    }
    if (error.message.includes("time zone")) {
      return { status: "error", fieldErrors: { timeZone: "timeZoneRequired" } };
    }
    return { status: "error", error: "generic" };
  }
  if (!data) return { status: "error", error: "notAllowed" };

  if (data.slug !== before?.slug) redirect(`/w/${data.slug}/settings/general`);
  revalidatePath("/w/[workspace]", "layout");
  return { status: "success" };
}

export type FeatureToggleResult =
  | { ok: true; changed: string[] }
  | { ok: false; dependants: string[] }
  | { ok: false; error: "notAllowed" | "generic" };

/** Switches a feature; when others depend on it, returns them so the user can confirm first. */
export async function toggleFeature(
  workspaceId: string,
  featureKey: string,
  enabled: boolean,
  includeDependants = false
): Promise<FeatureToggleResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_feature", {
    p_workspace_id: workspaceId,
    p_feature_key: featureKey,
    p_enabled: enabled,
    p_include_dependants: includeDependants,
  });

  if (error) {
    if (error.hint?.startsWith("dependants:")) {
      return { ok: false, dependants: error.hint.slice("dependants:".length).split(",") };
    }
    return { ok: false, error: error.code === "42501" ? "notAllowed" : "generic" };
  }
  revalidatePath("/w/[workspace]", "layout");
  return { ok: true, changed: data ?? [] };
}

/** Points the workspace at a newly uploaded logo (or none) and deletes the previous file. */
export async function setWorkspaceLogo(
  workspaceId: string,
  path: string | null
): Promise<{ ok: true } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("workspaces")
    .select("logo_path")
    .eq("id", workspaceId)
    .single();
  // The database refuses paths outside the workspace's folder, and people without settings rights.
  const { data, error } = await supabase
    .from("workspaces")
    .update({ logo_path: path })
    .eq("id", workspaceId)
    .select("id");
  if (error) return { ok: false, error: "generic" };
  if (!data?.length) return { ok: false, error: "notAllowed" };

  if (before?.logo_path && before.logo_path !== path) {
    await supabase.storage.from("workspace-logos").remove([before.logo_path]);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
