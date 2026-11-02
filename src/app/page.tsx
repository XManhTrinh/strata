import { redirect } from "next/navigation";
import { LandingPage } from "@/features/home/landing-page";
import { createClient } from "@/lib/supabase/server";

/** Signed in: the last workspace (or onboarding). Signed out: the homepage. */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (auth?.claims.sub) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_workspace_id")
      .eq("id", auth.claims.sub)
      .maybeSingle();

    // RLS only returns workspaces the user is an active member of.
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, slug")
      .order("created_at");

    const target = workspaces?.find((w) => w.id === profile?.last_workspace_id) ?? workspaces?.[0];
    redirect(target ? `/w/${target.slug}` : "/onboarding");
  }

  return <LandingPage />;
}
