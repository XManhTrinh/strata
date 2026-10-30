import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { TimeOffPage, type TimeOffTab } from "@/features/time/components/time-off-page";
import {
  bookableTypes,
  calendarEntries,
  myBalances,
  myBookings,
  myMemberId,
  pendingApprovals,
} from "@/features/time/time-off-queries";
import { createClient } from "@/lib/supabase/server";

export default async function TimeOffRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { workspace: slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();
  const [{ data: permissions }, memberId] = await Promise.all([
    supabase.rpc("my_permissions", { p_workspace_id: workspace.id }),
    myMemberId(workspace.id),
  ]);
  const held = new Set((permissions ?? []).map((p) => p.permission_key));
  if (!memberId || !(held.has("time.view") || held.has("time.book"))) notFound();

  const canApprove = held.has("time.approve");
  const tab: TimeOffTab =
    query.tab === "calendar"
      ? "calendar"
      : query.tab === "approvals" && canApprove
        ? "approvals"
        : "mine";
  const month = /^\d{4}-\d{2}$/.test(query.month ?? "")
    ? query.month!
    : new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const [types, balances, bookings, approvals, entries, t] = await Promise.all([
    bookableTypes(workspace.id),
    myBalances(memberId),
    tab === "mine" ? myBookings(workspace.id, memberId) : [],
    canApprove ? pendingApprovals(workspace.id) : [],
    tab === "calendar" ? calendarEntries(workspace.id, `${month}-01`, lastDay) : [],
    getTranslations("timeOff"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <TimeOffPage
          tab={tab}
          month={month}
          memberId={memberId}
          types={types}
          balances={balances}
          bookings={bookings}
          approvals={approvals}
          canApprove={canApprove}
          entries={entries}
        />
      </div>
    </>
  );
}
