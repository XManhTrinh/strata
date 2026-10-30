import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { RateCardsPage } from "@/features/planning/components/rate-cards-page";
import { listFieldChoices, listRateCards } from "@/features/planning/queries";
import { createClient } from "@/lib/supabase/server";

export default async function RateCardsRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, currency")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();
  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  const held = new Set((permissions ?? []).map((p) => p.permission_key));
  if (!held.has("rate_cards.view")) notFound();

  const [{ sets, groups, cards }, fields, t] = await Promise.all([
    listRateCards(workspace.id),
    listFieldChoices(workspace.id),
    getTranslations("rateCards"),
  ]);
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <RateCardsPage
          sets={sets}
          groups={groups}
          cards={cards}
          fields={fields}
          currency={workspace.currency}
          canEdit={held.has("rate_cards.edit")}
        />
      </div>
    </>
  );
}
