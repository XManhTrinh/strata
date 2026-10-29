import { notFound } from "next/navigation";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { requireSettingsSection } from "@/features/settings/require-section";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "general");
  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workspaces")
    .select("name, slug, country, time_zone, currency, fiscal_year_start_month, week_start")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!w) notFound();

  return (
    <GeneralSettingsForm
      siteHost={new URL(getPublicEnv().NEXT_PUBLIC_SITE_URL).host}
      initial={{
        name: w.name,
        slug: w.slug,
        country: w.country,
        timeZone: w.time_zone,
        currency: w.currency,
        fiscalYearStartMonth: String(w.fiscal_year_start_month),
        weekStart: String(w.week_start),
      }}
    />
  );
}
