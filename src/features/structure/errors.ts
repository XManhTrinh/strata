import type { ErrorKey } from "@/lib/form-state";
import messages from "@/messages/en.json";

/** The database's refusals carry the message key as their hint; `taken` names a duplicate. */
export function errorKey(
  error: { code?: string; hint?: string | null },
  taken: ErrorKey
): ErrorKey {
  if (error.hint && error.hint in messages.errors) return error.hint as ErrorKey;
  if (error.code === "42501") return "notAllowed";
  if (error.code === "23505") return taken;
  return "generic";
}
