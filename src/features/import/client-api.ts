"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ImportMapping } from "./mapping";
import type { ImportOptions, PreviewCounts, RowError } from "./types";

/**
 * The import runs from the browser under the importer's own rights (RLS and the import RPCs
 * check them), so large files never pass through a server request's size limit.
 */

const BATCH = 1000;

export async function startImport(
  workspaceId: string,
  mapping: ImportMapping,
  options: ImportOptions
): Promise<string> {
  const supabase = getBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      workspace_id: workspaceId,
      created_by: auth.user?.id ?? null,
      key_field: mapping.keyField,
      unit_level_ids: mapping.units.map((u) => u.levelId),
      effective_date: options.effectiveDate,
      mark_leavers: options.markLeavers,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not start the import.");
  return data.id;
}

/** Sends the mapped rows in batches, reporting how many have gone. */
export async function stageRows(
  workspaceId: string,
  jobId: string,
  rows: Record<string, unknown>[],
  onProgress: (sent: number) => void
): Promise<void> {
  const supabase = getBrowserClient();
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH).map((data, i) => ({
      job_id: jobId,
      workspace_id: workspaceId,
      row_number: start + i + 1,
      data: data as NonNullable<Json>,
    }));
    const { error } = await supabase.from("import_rows").insert(batch);
    if (error) throw new Error(error.message);
    onProgress(Math.min(start + BATCH, rows.length));
  }
}

export async function previewImport(jobId: string): Promise<PreviewCounts> {
  const { data, error } = await getBrowserClient().rpc("import_preview", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return data as unknown as PreviewCounts;
}

/** The rows the preview refused, with the key they carried. */
export async function loadRowErrors(jobId: string, keyField: string): Promise<RowError[]> {
  const { data } = await getBrowserClient()
    .from("import_rows")
    .select("row_number, data, errors")
    .eq("job_id", jobId)
    .eq("status", "error")
    .order("row_number")
    .limit(1000);
  return (data ?? []).map((r) => ({
    row: r.row_number,
    key: String((r.data as Record<string, unknown>)[keyField] ?? ""),
    errors: r.errors,
  }));
}

export async function applyChunk(
  jobId: string
): Promise<{ phase: string; processed: number; done: boolean }> {
  const { data, error } = await getBrowserClient().rpc("import_apply_chunk", {
    p_job_id: jobId,
    p_max_rows: 1000,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { phase: string; processed: number; done: boolean };
}

export async function cancelImport(jobId: string): Promise<void> {
  const { error } = await getBrowserClient()
    .from("import_jobs")
    .update({ status: "cancelled" })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
}

export async function saveMapping(
  workspaceId: string,
  name: string,
  mapping: ImportMapping
): Promise<void> {
  const supabase = getBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("import_mappings").upsert(
    {
      workspace_id: workspaceId,
      name,
      settings: mapping as unknown as NonNullable<Json>,
      created_by: auth.user?.id ?? null,
    },
    { onConflict: "workspace_id,name" }
  );
  if (error) throw new Error(error.message);
}
