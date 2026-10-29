"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "./errors";
import { customFieldSchema, fieldOptionSchema } from "./schemas";

function revalidateFields() {
  revalidatePath("/w/[workspace]/settings/fields", "page");
}

/** The sort order after the last entry: new fields and options go at the end. */
function after(last: { sort_order: number } | null): number {
  return (last?.sort_order ?? 0) + 10;
}

/** Adds a field at the end (with its key), or changes one (the key stays). */
export async function saveCustomField(
  workspaceId: string,
  fieldId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = customFieldSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  const { label, key, type, sensitive, required, keepHistory } = parsed.data;
  const values = { label, type, sensitive, required, keep_history: keepHistory };

  const supabase = await createClient();
  let error;
  if (fieldId) {
    ({ error } = await supabase.from("custom_fields").update(values).eq("id", fieldId));
  } else {
    if (!key) return { status: "error", fieldErrors: { key: "fieldKeyInvalid" } };
    ({ error } = await supabase.from("custom_fields").insert({
      workspace_id: workspaceId,
      key,
      sort_order: after(
        (
          await supabase
            .from("custom_fields")
            .select("sort_order")
            .eq("workspace_id", workspaceId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data
      ),
      ...values,
    }));
  }
  if (error) {
    const message = errorKey(error, "fieldKeyTaken");
    if (message === "fieldKeyTaken") return { status: "error", fieldErrors: { key: message } };
    if (message === "fieldTypeLocked") return { status: "error", fieldErrors: { type: message } };
    return { status: "error", error: message };
  }
  revalidateFields();
  return { status: "success" };
}

/** Adds an option at the end of a choice field, or renames one. */
export async function saveFieldOption(
  workspaceId: string,
  fieldId: string,
  optionId: string | null,
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = fieldOptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = optionId
    ? await supabase
        .from("custom_field_options")
        .update({ label: parsed.data.name })
        .eq("id", optionId)
    : await supabase.from("custom_field_options").insert({
        workspace_id: workspaceId,
        field_id: fieldId,
        label: parsed.data.name,
        sort_order: after(
          (
            await supabase
              .from("custom_field_options")
              .select("sort_order")
              .eq("field_id", fieldId)
              .order("sort_order", { ascending: false })
              .limit(1)
              .maybeSingle()
          ).data
        ),
      });
  if (error) {
    const message = errorKey(error, "optionLabelTaken");
    return message === "optionLabelTaken"
      ? { status: "error", fieldErrors: { name: message } }
      : { status: "error", error: message };
  }
  revalidateFields();
  return { status: "success" };
}
