"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ErrorKey } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "./errors";

type Result = { ok: true } | { ok: false; error: ErrorKey };

const ordered = z.enum([
  "career_levels",
  "employment_types",
  "custom_fields",
  "custom_field_options",
]);
const archivable = z.enum([...ordered.options, "positions"]);
export type OrderedTable = z.infer<typeof ordered>;

function revalidateStructure() {
  revalidatePath("/w/[workspace]/settings", "layout");
}

/**
 * Puts entries in the given order: a track's career levels (junior first, by rank), or a list of
 * employment types, custom fields or a field's options (by sort order).
 */
export async function reorderEntries(table: OrderedTable, ids: string[]): Promise<Result> {
  const target = ordered.parse(table);
  const supabase = await createClient();
  const results = await Promise.all(
    z
      .array(z.uuid())
      .parse(ids)
      .map((id, index) =>
        target === "career_levels"
          ? supabase
              .from("career_levels")
              .update({ rank: index + 1 })
              .eq("id", id)
          : supabase
              .from(target)
              .update({ sort_order: (index + 1) * 10 })
              .eq("id", id)
      )
  );
  revalidateStructure();
  const failed = results.find((r) => r.error)?.error;
  return failed ? { ok: false, error: errorKey(failed, "generic") } : { ok: true };
}

/** Archived entries stay on past records but can't be chosen for new ones. */
export async function setEntryArchived(
  table: z.infer<typeof archivable>,
  id: string,
  archived: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(archivable.parse(table))
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", z.uuid().parse(id));
  revalidateStructure();
  return error ? { ok: false, error: errorKey(error, "generic") } : { ok: true };
}
