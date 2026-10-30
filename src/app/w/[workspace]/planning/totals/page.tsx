import { notFound } from "next/navigation";
import { planningAccess } from "@/features/planning/access";
import { TotalsPage } from "@/features/planning/components/totals-page";
import { loadTotals, parseTotalsQuery } from "@/features/planning/totals-query";

export default async function TotalsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { workspace: slug } = await params;
  const { workspace, held } = await planningAccess(slug);
  if (!held.has("planning.view")) notFound();
  const view = await loadTotals(workspace.id, parseTotalsQuery(await searchParams));
  return (
    <TotalsPage
      view={view}
      currency={workspace.currency}
      canSeeCost={held.has("planning.view_cost")}
    />
  );
}
