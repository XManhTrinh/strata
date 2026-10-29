import { requireSettingsSection } from "@/features/settings/require-section";
import { notFound } from "next/navigation";
import {
  type FeatureRow,
  FeaturesSettings,
} from "@/features/settings/components/features-settings";
import { createClient } from "@/lib/supabase/server";

export default async function FeaturesSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, plan_key")
    .eq("id", await requireSettingsSection(slug, "features"))
    .single();
  if (!workspace) notFound();

  const [{ data: features }, { data: enabled }, { data: dependencies }, { data: planFeatures }] =
    await Promise.all([
      supabase.from("features").select("key").eq("is_core", false).order("sort_order"),
      supabase
        .from("workspace_features")
        .select("feature_key")
        .eq("workspace_id", workspace.id)
        .eq("enabled", true),
      supabase.from("feature_dependencies").select("feature_key, requires_key"),
      supabase
        .from("subscription_plan_features")
        .select("feature_key")
        .eq("plan_key", workspace.plan_key),
    ]);

  const on = new Set((enabled ?? []).map((f) => f.feature_key));
  const allowed = new Set((planFeatures ?? []).map((f) => f.feature_key));
  const rows: FeatureRow[] = (features ?? []).map((f) => ({
    key: f.key,
    enabled: on.has(f.key),
    inPlan: allowed.has(f.key),
    requires: (dependencies ?? [])
      .filter((d) => d.feature_key === f.key)
      .map((d) => d.requires_key),
  }));

  return <FeaturesSettings features={rows} />;
}
