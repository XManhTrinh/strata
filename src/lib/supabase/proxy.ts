import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase session cookie and verifies the session token on every request.
 * `getClaims()` checks the token's signature, unlike `getSession()`, which only reads the
 * cookie and must never be used for auth decisions on the server.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; userId: string | null }> {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    }
  );

  // Nothing may run between creating the client and this call, or sessions can be lost.
  const { data } = await supabase.auth.getClaims();

  return { response, userId: data?.claims.sub ?? null };
}

/** A redirect that keeps any session cookies the refresh just set. */
export function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
