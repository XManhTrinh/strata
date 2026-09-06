import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback route handler.
 * Supabase redirects here after a successful OAuth sign-in (e.g. Google).
 * Exchanges the authorization code for a session and redirects the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  if (code) {
    const response = NextResponse.redirect(new URL(returnUrl, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
