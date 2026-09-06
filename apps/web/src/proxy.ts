import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Using getSession() instead of getUser() because the Next.js server
  // (running behind a corporate VPN) cannot reliably reach Supabase's
  // auth endpoint for token verification. getSession() reads from the
  // cookie locally without a network call. The browser client still
  // validates tokens against Supabase directly.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const { pathname } = request.nextUrl;

  // Static assets — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Public paths
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/sso");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
