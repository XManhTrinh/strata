import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { ImportNeedsLargerScreen, ImportWizard } from "@/features/import/components/import-wizard";
import type { ImportMapping } from "@/features/import/mapping";
import type { ImportJobSummary, PreviewCounts } from "@/features/import/types";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();
  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  if (!permissions?.some((p) => p.permission_key === "people.import")) notFound();

  const [{ data: levels }, { data: fields }, { data: mappings }, { data: jobs }, t] =
    await Promise.all([
      supabase
        .from("org_unit_levels")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("custom_fields")
        .select("key, label")
        .eq("workspace_id", workspace.id)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("import_mappings")
        .select("id, name, settings")
        .eq("workspace_id", workspace.id)
        .order("name"),
      supabase
        .from("import_jobs")
        .select("id, status, phase, created_at, counts")
        .eq("workspace_id", workspace.id)
        .in("status", ["staging", "previewed", "applying"])
        .order("created_at", { ascending: false })
        .limit(10),
      getTranslations("import"),
    ]);

  const unfinished: ImportJobSummary[] = (jobs ?? []).map((j) => ({
    id: j.id,
    status: j.status,
    phase: j.phase,
    createdAt: j.created_at,
    counts: j.counts as Partial<PreviewCounts>,
  }));

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <div className="medium:hidden">
          <ImportNeedsLargerScreen />
        </div>
        <div className="medium:block hidden">
          <ImportWizard
            levels={(levels ?? []).map((l) => ({ id: l.id, name: l.name }))}
            customFields={fields ?? []}
            saved={(mappings ?? []).map((m) => ({
              id: m.id,
              name: m.name,
              mapping: m.settings as unknown as ImportMapping,
            }))}
            unfinished={unfinished}
          />
        </div>
      </div>
    </>
  );
}
