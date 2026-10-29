"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ErrorKey, FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "./errors";
import { careerLevelSchema, employmentTypeSchema, positionSchema } from "./schemas";

type Result = { ok: true } | { ok: false; error: ErrorKey };

const archivable = z.enum(["career_levels", "positions", "employment_types"]);
const ordered = z.enum(["career_levels", "employment_types"]);

function revalidateJobs() {
  revalidatePath("/w/[workspace]/settings/jobs", "page");
}

/** A form result: duplicates show on the name field, anything else above the form. */
function failure(error: { code?: string; hint?: string | null }, taken: ErrorKey): FormState {
  const key = errorKey(error, taken);
  return key === taken
    ? { status: "error", fieldErrors: { name: key } }
    : { status: "error", error: key };
}

/** The rank after the last level on a track: new levels go on top. */
async function nextRank(workspaceId: string, track: string | null): Promise<number> {
  const supabase = await createClient();
  const query = supabase.from("career_levels").select("rank").eq("workspace_id", workspaceId);
  const { data } = await (track ? query.eq("track", track) : query.is("track", null))
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.rank ?? 0) + 1;
}

/** Adds a career level at the top of its track, or changes one (moving track puts it on top). */
export async function saveCareerLevel(
  workspaceId: string,
  level: { id: string; track: string | null } | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = careerLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const { name, track } = parsed.data;

  const supabase = await createClient();
  const rank = !level || level.track !== track ? await nextRank(workspaceId, track) : undefined;
  const { error } = level
    ? await supabase.from("career_levels").update({ name, track, rank }).eq("id", level.id)
    : await supabase
        .from("career_levels")
        .insert({ workspace_id: workspaceId, name, track, rank: rank! });
  if (error) return failure(error, "careerLevelNameTaken");
  revalidateJobs();
  return { status: "success" };
}

export async function savePosition(
  workspaceId: string,
  positionId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = positionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const values = {
    name: parsed.data.name,
    description: parsed.data.description,
    min_level_id: parsed.data.minLevelId,
    max_level_id: parsed.data.maxLevelId,
  };

  const supabase = await createClient();
  const { error } = positionId
    ? await supabase.from("positions").update(values).eq("id", positionId)
    : await supabase.from("positions").insert({ workspace_id: workspaceId, ...values });
  if (error) return failure(error, "positionNameTaken");
  revalidateJobs();
  return { status: "success" };
}

async function nextSortOrder(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employment_types")
    .select("sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

/** Adds an employment type at the end of the list, or changes one. */
export async function saveEmploymentType(
  workspaceId: string,
  typeId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = employmentTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const values = { name: parsed.data.name, cost_method: parsed.data.costMethod };

  const supabase = await createClient();
  const { error } = typeId
    ? await supabase.from("employment_types").update(values).eq("id", typeId)
    : await supabase.from("employment_types").insert({
        workspace_id: workspaceId,
        sort_order: await nextSortOrder(workspaceId),
        ...values,
      });
  if (error) return failure(error, "employmentTypeNameTaken");
  revalidateJobs();
  return { status: "success" };
}

/** Puts entries in the given order: a track's career levels (junior first) or employment types. */
export async function reorderJobEntries(
  table: z.infer<typeof ordered>,
  ids: string[]
): Promise<Result> {
  const supabase = await createClient();
  const results = await Promise.all(
    z
      .array(z.uuid())
      .parse(ids)
      .map((id, index) =>
        ordered.parse(table) === "career_levels"
          ? supabase
              .from("career_levels")
              .update({ rank: index + 1 })
              .eq("id", id)
          : supabase
              .from("employment_types")
              .update({ sort_order: (index + 1) * 10 })
              .eq("id", id)
      )
  );
  revalidateJobs();
  const failed = results.find((r) => r.error)?.error;
  return failed ? { ok: false, error: errorKey(failed, "generic") } : { ok: true };
}

/** Archived entries stay on past records but can't be chosen for new ones. */
export async function setJobEntryArchived(
  table: z.infer<typeof archivable>,
  id: string,
  archived: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(archivable.parse(table))
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", z.uuid().parse(id));
  revalidateJobs();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}
