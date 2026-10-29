import type { z } from "zod";
import type messages from "@/messages/en.json";

/** A message in the `errors` namespace of the translation files. */
export type ErrorKey = keyof (typeof messages)["errors"];

/** Result of a form's Server Action: translation keys only, so every text stays translatable. */
export type FormState<Field extends string = string> = {
  status: "idle" | "error" | "success";
  error?: ErrorKey;
  fieldErrors?: Partial<Record<Field, ErrorKey>>;
};

export const idleFormState: FormState = { status: "idle" };

/** The first error for each top-level field, as translation keys set in the zod schema. */
export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError
): Partial<Record<Field, ErrorKey>> {
  const fieldErrors: Partial<Record<Field, ErrorKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]) as Field;
    fieldErrors[field] ??= issue.message as ErrorKey;
  }
  return fieldErrors;
}

/** Narrows a value from a URL (e.g. `?error=`) to a known error message key. */
export function isErrorKey(value: unknown, keys: readonly string[]): value is ErrorKey {
  return typeof value === "string" && keys.includes(value);
}
