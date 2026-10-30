"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { scenarioNameSchema, scenarioSchema } from "./schemas";
import type { ScenarioStatus } from "./types";

type Result = { ok: true } | { ok: false; error: ErrorKey };

function revalidateScenarios() {
  revalidatePath("/w/[workspace]/planning", "layout");
}

function failure(error: { code?: string; hint?: string | null }): FormState {
  const key = errorKey(error, "scenarioNameTaken");
  return key === "scenarioNameTaken"
    ? { status: "error", fieldErrors: { name: key } }
    : { status: "error", error: key };
}

async function done(
  promise: PromiseLike<{ error: { code?: string; hint?: string | null } | null }>
): Promise<Result> {
  const { error } = await promise;
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidateScenarios();
  return { ok: true };
}

export async function createScenario(
  workspaceId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = scenarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_scenario", {
    p_workspace_id: workspaceId,
    p_name: parsed.data.name,
    p_first_period: parsed.data.firstPeriod,
    p_last_period: parsed.data.lastPeriod,
    p_from_people: parsed.data.fromPeople,
  });
  if (error) return failure(error);
  revalidateScenarios();
  return { status: "success" };
}

export async function copyScenario(
  scenarioId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = scenarioNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("copy_scenario", {
    p_scenario_id: scenarioId,
    p_name: parsed.data.name,
  });
  if (error) return failure(error);
  revalidateScenarios();
  return { status: "success" };
}

export async function renameScenario(
  scenarioId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = scenarioNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .update({ name: parsed.data.name })
    .eq("id", scenarioId)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { status: "error", error: "notAllowed" };
  revalidateScenarios();
  return { status: "success" };
}

export async function setScenarioStatus(
  scenarioId: string,
  status: ScenarioStatus
): Promise<Result> {
  const supabase = await createClient();
  return done(supabase.rpc("set_scenario_status", { p_scenario_id: scenarioId, p_status: status }));
}

export async function setLiveScenario(scenarioId: string): Promise<Result> {
  const supabase = await createClient();
  return done(supabase.rpc("set_live_scenario", { p_scenario_id: scenarioId }));
}

export async function setScenarioArchived(scenarioId: string, archived: boolean): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", scenarioId)
    .select("id");
  if (error) return { ok: false, error: errorKey(error, "generic") };
  if (!data?.length) return { ok: false, error: "notAllowed" };
  revalidateScenarios();
  return { ok: true };
}

export async function deleteScenario(scenarioId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scenarios")
    .delete()
    .eq("id", scenarioId)
    .select("id");
  if (error) return { ok: false, error: errorKey(error, "generic") };
  // Live plans (and approved ones, for editors) are kept by the policies.
  if (!data?.length) return { ok: false, error: "scenarioNotDeleted" };
  revalidateScenarios();
  return { ok: true };
}

export async function applyRateCards(scenarioId: string): Promise<Result> {
  const supabase = await createClient();
  return done(supabase.rpc("apply_rate_cards", { p_scenario_id: scenarioId }));
}
