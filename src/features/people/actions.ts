"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorKey } from "@/features/structure/errors";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { jobSchema, newPersonSchema, paySchema, personDetailsSchema } from "./schemas";

type Result = { ok: true } | { ok: false; error: ErrorKey };

function revalidatePeople() {
  revalidatePath("/w/[workspace]/people", "layout");
}

/** A duplicate email or person key, shown on its field. */
function detailsFailure(error: {
  code?: string;
  hint?: string | null;
  message?: string;
}): FormState {
  if (error.code === "23505") {
    return error.message?.includes("person_key")
      ? { status: "error", fieldErrors: { personKey: "personKeyTaken" } }
      : { status: "error", fieldErrors: { email: "personEmailTaken" } };
  }
  return { status: "error", error: errorKey(error, "generic") };
}

/** Adds a person with their first job record, then opens their profile. */
export async function addPerson(
  workspaceId: string,
  slug: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = newPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const p = parsed.data;

  const supabase = await createClient();
  const { data: memberId, error } = await supabase.rpc("add_person", {
    p_workspace_id: workspaceId,
    p_full_name: p.fullName,
    p_email: p.email ?? undefined,
    p_person_key: p.personKey ?? undefined,
    p_start_date: p.startDate ?? undefined,
    p_org_unit_id: p.unitId,
    p_manager_member_id: p.managerId ?? undefined,
    p_position_id: p.positionId ?? undefined,
    p_career_level_id: p.careerLevelId ?? undefined,
    p_employment_type_id: p.employmentTypeId ?? undefined,
  });
  if (error || !memberId)
    return error ? detailsFailure(error) : { status: "error", error: "generic" };
  revalidatePeople();
  redirect(`/w/${slug}/people/${memberId}`);
}

export async function updatePersonDetails(
  memberId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = personDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      person_key: parsed.data.personKey,
      start_date: parsed.data.startDate,
    })
    .eq("id", memberId)
    .select("id");
  if (error) return detailsFailure(error);
  if (!data?.length) return { status: "error", error: "notAllowed" };
  revalidatePeople();
  return { status: "success" };
}

/** The end-date form: a last day, or none. */
export async function saveEndDate(
  memberId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const value = String(formData.get("endDate") ?? "");
  if (!z.iso.date().safeParse(value).success) {
    return { status: "error", fieldErrors: { endDate: "dateRequired" } };
  }
  const result = await setEndDate(memberId, value);
  return result.ok ? { status: "success" } : { status: "error", error: result.error };
}

/** Leaving is a date, never a deletion; null takes the date away. */
export async function setEndDate(memberId: string, endDate: string | null): Promise<Result> {
  const date = z.iso.date().nullable().parse(endDate);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .update({ end_date: date })
    .eq("id", memberId)
    .select("id");
  revalidatePeople();
  if (error) return { ok: false, error: error.code === "23514" ? "endBeforeStart" : "generic" };
  return data?.length ? { ok: true } : { ok: false, error: "notAllowed" };
}

export async function changeJob(
  memberId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const j = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_job", {
    p_member_id: memberId,
    p_valid_from: j.validFrom,
    p_org_unit_id: j.unitId,
    p_manager_member_id: j.managerId ?? undefined,
    p_position_id: j.positionId ?? undefined,
    p_career_level_id: j.careerLevelId ?? undefined,
    p_employment_type_id: j.employmentTypeId ?? undefined,
  });
  if (error) {
    const key = errorKey(error, "generic");
    return key === "managerCycle"
      ? { status: "error", fieldErrors: { managerId: key } }
      : { status: "error", error: key };
  }
  revalidatePeople();
  return { status: "success" };
}

export async function removeJobChange(assignmentId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_job_change", {
    p_assignment_id: z.uuid().parse(assignmentId),
  });
  revalidatePeople();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}

export async function changePay(
  memberId: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_pay", {
    p_member_id: memberId,
    p_valid_from: parsed.data.validFrom,
    p_annual_salary: parsed.data.annualSalary ?? undefined,
    p_day_rate: parsed.data.dayRate ?? undefined,
    p_currency: parsed.data.currency,
  });
  if (error) return { status: "error", error: errorKey(error, "generic") };
  revalidatePeople();
  return { status: "success" };
}

/** Reads a custom field's value from its form, by type; empty clears the field. */
function fieldValueFrom(type: string, formData: FormData): unknown {
  if (type === "multi_choice") return formData.getAll("value").map(String);
  const raw = String(formData.get("value") ?? "").trim();
  if (raw === "") return null;
  if (type === "number") {
    const number = Number(raw);
    return Number.isFinite(number) ? number : undefined;
  }
  if (type === "date") return z.iso.date().safeParse(raw).success ? raw : undefined;
  return raw.slice(0, 2000);
}

/** Sets one custom field from a date (fields without history ignore the date). */
export async function saveFieldValue(
  memberId: string,
  fieldId: string,
  type: string,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const value = fieldValueFrom(type, formData);
  if (value === undefined) return { status: "error", fieldErrors: { value: "amountInvalid" } };
  const validFrom = String(formData.get("validFrom") || new Date().toISOString().slice(0, 10));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_field_value", {
    p_member_id: memberId,
    p_field_id: z.uuid().parse(fieldId),
    p_valid_from: z.iso.date().parse(validFrom),
    p_value: Array.isArray(value) && value.length === 0 ? null : (value as never),
  });
  if (error) return { status: "error", error: errorKey(error, "generic") };
  revalidatePeople();
  return { status: "success" };
}

/** Up to 20 people matching the text, for choosing a manager. */
export async function searchPeople(
  workspaceId: string,
  search: string
): Promise<{ id: string; name: string; detail: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("people_directory", {
    p_workspace_id: z.uuid().parse(workspaceId),
    p_search: search.slice(0, 200),
    p_limit: 20,
  });
  return (data ?? []).map((p) => ({
    id: p.member_id,
    name: p.full_name,
    detail: [p.position_name, p.unit_name].filter(Boolean).join(" · "),
  }));
}
