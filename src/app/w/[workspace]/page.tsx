import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DashboardPage } from "@/features/workspaces/components/dashboard-page";
import type { HomeSummary } from "@/features/workspaces/home-summary";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();
  const { data } = await supabase.rpc("home_summary", { p_workspace_id: workspace.id });
  return <DashboardPage summary={(data ?? {}) as HomeSummary} />;
}
