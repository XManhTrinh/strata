import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client using the secret (service_role) key.
 * This client bypasses RLS and should only be used server-side.
 *
 * The client is lazily initialized and reused as a singleton.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables',
    );
  }

  adminClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
