import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Signed links for profile photos in the private `avatars` bucket. Storage RLS decides which the
 * caller may see (their own and co-members'); others are simply left out.
 */
export async function signedAvatarUrls(
  supabase: SupabaseClient<Database>,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  return new Map(
    (data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []
    )
  );
}
