import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Refreshes the Supabase session cookie and verifies the session token on every request.
 * `getClaims()` checks the token's signature, unlike `getSession()`, which only reads the
 * cookie and must never be used for auth decisions on the server.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
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
  // Route protection is added in Phase 1, when there are protected routes.
  await supabase.auth.getClaims();

  return response;
}
