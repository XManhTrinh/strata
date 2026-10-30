import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { loadTotals, parseTotalsQuery } from "@/features/planning/totals-query";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

/** The Totals screen as CSV: the same scenario, grouping, measure and months. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspace: string }> }
) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) return new Response("Not found", { status: 404 });
  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  if (!permissions?.some((p) => p.permission_key === "planning.view")) {
    return new Response("Not allowed", { status: 403 });
  }

  const view = await loadTotals(
    workspace.id,
    parseTotalsQuery(Object.fromEntries(request.nextUrl.searchParams))
  );
  const t = await getTranslations("totals");
  const measure = view.query.measure;
  const lines = [
    csvRow([t("group"), ...view.table.months, t(measure === "cost" ? "total" : "average")]),
    ...view.table.rows.map((r) => csvRow([r.label || t("noValue"), ...r.values, r.summary])),
  ];
  const name = `${view.scenario?.name ?? "plan"}-${measure}`.replace(/[^\w-]+/g, "-");
  return new Response(CSV_BOM + lines.join(""), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
