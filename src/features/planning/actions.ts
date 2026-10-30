"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import {
  planningSettingsSchema,
  rateCardGroupSchema,
  rateCardSchema,
  rateCardSetSchema,
} from "./schemas";
import type { RateCardPreview } from "./types";

type Result = { ok: true } | { ok: false; error: ErrorKey };

function revalidatePlanning() {
  revalidatePath("/w/[workspace]/planning", "layout");
  revalidatePath("/w/[workspace]/settings", "layout");
}

function failure(error: { code?: string; hint?: string | null }, taken: ErrorKey): FormState {
  const key = errorKey(error, taken);
  return key === taken
    ? { status: "error", fieldErrors: { name: key } }
    : { status: "error", error: key };
}

export async function savePlanningSettings(
  workspaceId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = planningSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const s = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planning_settings")
    .update({
      period: s.period,
      horizon_years: s.horizonYears,
      display_unit: s.displayUnit,
      over_allocation: s.overAllocation,
      basis: s.basis,
      lifecycle: s.lifecycle,
      cost_split_field_id: s.costSplitFieldId,
    })
    .eq("workspace_id", workspaceId)
    .select("workspace_id");
  if (error) return { status: "error", error: errorKey(error, "generic") };
  // RLS hides the row from people who may not change it, so nothing is updated.
  if (!data?.length) return { status: "error", error: "notAllowed" };
  revalidatePlanning();
  return { status: "success" };
}

export async function saveRateCard(
  workspaceId: string,
  cardId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = rateCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const card = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_rate_card", {
    p_workspace_id: workspaceId,
    p_card_id: cardId ?? undefined,
    p_name: card.name,
    p_group_id: card.groupId ?? undefined,
    p_priority: card.priority,
    p_is_default: card.isDefault,
    p_conditions: card.conditions,
    p_rates: card.rates.map((r) => ({
      valid_from: r.validFrom,
      day_rate: r.dayRate,
      working_days: r.workingDays,
      currency: r.currency,
    })),
  });
  if (error) return failure(error, "generic");
  revalidatePlanning();
  return { status: "success" };
}

export async function saveRateCardSet(
  workspaceId: string,
  setId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = rateCardSetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = setId
    ? await supabase.from("rate_card_sets").update({ name: parsed.data.name }).eq("id", setId)
    : await supabase
        .from("rate_card_sets")
        .insert({ workspace_id: workspaceId, name: parsed.data.name });
  if (error) return failure(error, "rateCardSetNameTaken");
  revalidatePlanning();
  return { status: "success" };
}

export async function saveRateCardGroup(
  workspaceId: string,
  groupId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = rateCardGroupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const values = { name: parsed.data.name, set_id: parsed.data.setId };
  const supabase = await createClient();
  const { error } = groupId
    ? await supabase.from("rate_card_groups").update(values).eq("id", groupId)
    : await supabase.from("rate_card_groups").insert({ workspace_id: workspaceId, ...values });
  if (error) return failure(error, "generic");
  revalidatePlanning();
  return { status: "success" };
}

/** Removes a set or group; what was in it stays, outside any set or group. */
export async function deleteRateCardContainer(
  table: "rate_card_sets" | "rate_card_groups",
  id: string
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
  if (error) return { ok: false, error: errorKey(error, "generic") };
  if (!data?.length) return { ok: false, error: "notAllowed" };
  revalidatePlanning();
  return { ok: true };
}

export async function setRateCardArchived(cardId: string, archived: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_cards")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", cardId)
    .select("id");
  if (error) return { ok: false, error: errorKey(error, "generic") };
  if (!data?.length) return { ok: false, error: "notAllowed" };
  revalidatePlanning();
  return { ok: true };
}

/** Which card a person would get in a month, and what it costs. */
export async function previewRateCard(
  workspaceId: string,
  memberId: string,
  month: string
): Promise<RateCardPreview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("rate_card_preview", {
      p_workspace_id: workspaceId,
      p_member_id: memberId,
      p_month: month,
    })
    .maybeSingle();
  return (
    data && {
      cardName: data.rate_card_name,
      source: data.source,
      monthlyCost: data.monthly_cost === null ? null : Number(data.monthly_cost),
      currency: data.currency,
    }
  );
}
