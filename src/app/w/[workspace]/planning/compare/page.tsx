import { notFound } from "next/navigation";
import { planningAccess } from "@/features/planning/access";
import { type CompareRow, ComparePage } from "@/features/planning/components/compare-page";
import { listScenarios, scenarioTotals } from "@/features/planning/scenario-queries";
import type { TotalsRow } from "@/features/planning/types";

/** Months from one first-of-month to another, both included. */
function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm) + 1;
}

/** Average FTE a month and total cost per group over the months compared. */
function byGroup(rows: TotalsRow[], months: number) {
  const groups = new Map<string, { label: string; fte: number; cost: number | null }>();
  for (const r of rows) {
    const key = r.groupId ?? "";
    const g = groups.get(key) ?? {
      label: r.groupLabel ?? "",
      fte: 0,
      cost: r.cost === null ? null : 0,
    };
    g.fte += r.fte / months;
    if (g.cost !== null && r.cost !== null) g.cost += r.cost;
    groups.set(key, g);
  }
  return groups;
}

export default async function CompareRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { workspace: slug } = await params;
  const query = await searchParams;
  const { workspace, held } = await planningAccess(slug);
  if (!held.has("planning.view")) notFound();

  const scenarios = (await listScenarios(workspace.id)).filter((s) => !s.archived);
  const a = scenarios.find((s) => s.id === query.a) ?? scenarios[0];
  const b =
    scenarios.find((s) => s.id === query.b && s.id !== a?.id) ??
    scenarios.find((s) => s.id !== a?.id);
  if (!a || !b)
    return (
      <ComparePage
        scenarios={scenarios}
        a={a?.id ?? null}
        b={null}
        rows={[]}
        months={null}
        currency={workspace.currency}
      />
    );

  // The months both plan.
  const from = a.firstPeriod > b.firstPeriod ? a.firstPeriod : b.firstPeriod;
  const to = a.lastPeriod < b.lastPeriod ? a.lastPeriod : b.lastPeriod;
  if (from > to) {
    return (
      <ComparePage
        scenarios={scenarios}
        a={a.id}
        b={b.id}
        rows={[]}
        months={{ from, to, count: 0 }}
        currency={workspace.currency}
      />
    );
  }
  const count = monthsBetween(from, to);
  const [totalsA, totalsB] = await Promise.all([
    scenarioTotals(a.id, from, to, { unit: null }),
    scenarioTotals(b.id, from, to, { unit: null }),
  ]);
  const groupsA = byGroup(totalsA, count);
  const groupsB = byGroup(totalsB, count);
  const rows: CompareRow[] = [...new Set([...groupsA.keys(), ...groupsB.keys()])].map((id) => {
    const x = groupsA.get(id);
    const y = groupsB.get(id);
    return {
      id,
      team: x?.label ?? y?.label ?? "",
      fteA: x?.fte ?? 0,
      fteB: y?.fte ?? 0,
      costA: x ? x.cost : 0,
      costB: y ? y.cost : 0,
    };
  });
  return (
    <ComparePage
      scenarios={scenarios}
      a={a.id}
      b={b.id}
      rows={rows}
      months={{ from, to, count }}
      currency={workspace.currency}
    />
  );
}
