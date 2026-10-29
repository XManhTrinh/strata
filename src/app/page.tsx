import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@windmorph/react";
import { createClient } from "@/lib/supabase/server";

/** Signed in: the last workspace (or onboarding). Signed out: a short landing page. */
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

  const t = await getTranslations("home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-display-medium text-on-surface">{t("title")}</h1>
      <p className="text-body-large text-on-surface-variant max-w-prose text-center">
        {t("subtitle")}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="filled" href="/sign-up">
          {t("getStarted")}
        </Button>
        <Button variant="outlined" href="/sign-in">
          {t("signIn")}
        </Button>
      </div>
    </main>
  );
}
