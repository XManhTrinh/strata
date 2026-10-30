import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { loadChart, loadUnitCounts } from "@/features/org-chart/actions";
import { type ChartQuery, OrgChartPage } from "@/features/org-chart/components/org-chart-page";
import { listHierarchy } from "@/features/structure/queries";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function OrgChartRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const raw = await searchParams;
  const get = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : undefined);
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();

  const [{ data: permissions }, { data: auth }] = await Promise.all([
    supabase.rpc("my_permissions", { p_workspace_id: workspace.id }),
    supabase.auth.getClaims(),
  ]);
  if (!permissions?.some((p) => p.permission_key === "org_chart.view")) notFound();
  const { data: me } = await supabase
    .from("members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", auth?.claims.sub ?? "")
    .maybeSingle();

  // Opens on you, unless another person or the top ("top") is asked for.
  const today = new Date().toISOString().slice(0, 10);
  const person = get("person");
  const query: ChartQuery = {
    view: get("view") === "units" ? "units" : "people",
    asOf: ISO_DATE.test(get("date") ?? "") ? get("date")! : today,
    personId: person === "top" ? null : person && UUID.test(person) ? person : (me?.id ?? null),
    unitId: UUID.test(get("unit") ?? "") ? get("unit")! : null,
  };

  const [slice, hierarchy, counts, unitPeople, t] = await Promise.all([
    query.view === "people"
      ? loadChart(workspace.id, { rootId: query.personId, asOf: query.asOf, depth: 2 })
      : { people: [], truncated: false },
    query.view === "units" ? listHierarchy(workspace.id) : { units: [], levels: [] },
    query.view === "units" ? loadUnitCounts(workspace.id, query.asOf) : [],
    query.view === "units" && query.unitId
      ? loadChart(workspace.id, { unitId: query.unitId, asOf: query.asOf }).then((s) => s.people)
      : [],
    getTranslations("orgChart"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <OrgChartPage
          query={query}
          today={today}
          meId={me?.id ?? null}
          slice={slice}
          units={hierarchy.units}
          levels={hierarchy.levels}
          counts={counts}
          unitPeople={unitPeople}
        />
      </div>
    </>
  );
}
