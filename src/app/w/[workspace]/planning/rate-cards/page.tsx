import { notFound } from "next/navigation";
import { planningAccess } from "@/features/planning/access";
import { RateCardsPage } from "@/features/planning/components/rate-cards-page";
import { listFieldChoices, listRateCards } from "@/features/planning/queries";

export default async function RateCardsRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, held } = await planningAccess(slug);
  if (!held.has("rate_cards.view")) notFound();
  const [{ sets, groups, cards }, fields] = await Promise.all([
    listRateCards(workspace.id),
    listFieldChoices(workspace.id),
  ]);
  return (
    <RateCardsPage
      sets={sets}
      groups={groups}
      cards={cards}
      fields={fields}
      currency={workspace.currency}
      canEdit={held.has("rate_cards.edit")}
    />
  );
}
