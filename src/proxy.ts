import type { NextRequest } from "next/server";
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/w/", "/onboarding", "/account"];
const SIGNED_OUT_ONLY = ["/sign-in", "/sign-up", "/forgot-password"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && matches(pathname, [...PROTECTED_PREFIXES, "/update-password"])) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithSession(url, response);
  }

  if (userId && matches(pathname, SIGNED_OUT_ONLY)) {
    return redirectWithSession(new URL("/", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
