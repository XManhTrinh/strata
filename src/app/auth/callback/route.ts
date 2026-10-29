import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

/** Where email confirmation, password reset and Google sign-in links land. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=linkInvalid", request.url));
}
