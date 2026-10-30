"use client";

import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Select, SelectItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { type ColumnDef, DataTable } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import type { Scenario } from "../types";

export type CompareRow = {
  id: string;
  team: string;
  /** Average FTE a month over the months compared. */
  fteA: number;
  fteB: number;
  /** Total cost over those months; null when the caller can't see cost. */
  costA: number | null;
  costB: number | null;
};

/** Two scenarios side by side: FTE and cost by team over the months both plan. */
export function ComparePage({
  scenarios,
  a,
  b,
  rows,
  months,
  currency,
}: {
  scenarios: Scenario[];
  a: string | null;
  b: string | null;
  rows: CompareRow[];
  months: { from: string; to: string; count: number } | null;
  currency: string;
}) {
  const t = useTranslations("compare");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const labels = useDataTableLabels();
  const nameOf = (id: string | null) => scenarios.find((s) => s.id === id)?.name ?? "";
  const showCost = rows.some((r) => r.costA !== null || r.costB !== null);
  const fte = (n: number) => format.number(n, { maximumFractionDigits: 2 });
  const money = (n: number | null) =>
    n === null ? "" : format.number(n, { style: "currency", currency, maximumFractionDigits: 0 });
  const change = (n: number, render: (v: number) => string) =>
    n === 0 ? render(0) : `${n > 0 ? "+" : "−"}${render(Math.abs(n))}`;
  const month = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  function choose(side: "a" | "b", id: string) {
    const next = { a, b, [side]: id };
    router.push(`${pathname}?a=${next.a ?? ""}&b=${next.b ?? ""}`);
  }

  if (scenarios.length < 2) {
    return (
      <EmptyState
        titleAs="h2"
        icon={<Icon name="compare_arrows" />}
        title={t("needTwoTitle")}
        description={t("needTwo")}
      />
    );
  }

  const columns: ColumnDef<CompareRow>[] = [
    { id: "team", header: t("team"), accessor: (r) => r.team, isRowHeader: true, sortable: true },
    {
      id: "fteA",
      header: t("fteOf", { name: nameOf(a) }),
      accessor: (r) => r.fteA,
      type: "number",
      align: "end",
      cell: (r) => fte(r.fteA),
      sortable: true,
    },
    {
      id: "fteB",
      header: t("fteOf", { name: nameOf(b) }),
      accessor: (r) => r.fteB,
      type: "number",
      align: "end",
      cell: (r) => fte(r.fteB),
      sortable: true,
    },
    {
      id: "fteChange",
      header: t("fteChange"),
      accessor: (r) => r.fteB - r.fteA,
      type: "number",
      align: "end",
      cell: (r) => change(r.fteB - r.fteA, fte),
      sortable: true,
    },
    ...(showCost
      ? ([
          {
            id: "costA",
            header: t("costOf", { name: nameOf(a) }),
            accessor: (r) => r.costA,
            type: "currency",
            align: "end",
            cell: (r) => money(r.costA),
            sortable: true,
          },
          {
            id: "costB",
            header: t("costOf", { name: nameOf(b) }),
            accessor: (r) => r.costB,
            type: "currency",
            align: "end",
            cell: (r) => money(r.costB),
            sortable: true,
          },
          {
            id: "costChange",
            header: t("costChange"),
            accessor: (r) => (r.costB ?? 0) - (r.costA ?? 0),
            type: "currency",
            align: "end",
            cell: (r) => change((r.costB ?? 0) - (r.costA ?? 0), (v) => money(v)),
            sortable: true,
          },
        ] satisfies ColumnDef<CompareRow>[])
      : []),
  ];
  const total = rows.reduce(
    (sum, r) => ({
      fteA: sum.fteA + r.fteA,
      fteB: sum.fteB + r.fteB,
      costA: sum.costA + (r.costA ?? 0),
      costB: sum.costB + (r.costB ?? 0),
    }),
    { fteA: 0, fteB: 0, costA: 0, costB: 0 }
  );

  return (
    <section aria-labelledby="compare-title" className="flex flex-col gap-4">
      <h2 id="compare-title" className="text-headline-small text-on-surface">
        {t("title")}
      </h2>
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        {(["a", "b"] as const).map((side) => (
          <Select
            key={side}
            className="w-full"
            label={t(side === "a" ? "first" : "second")}
            value={side === "a" ? a : b}
            onChange={(key) => key != null && choose(side, String(key))}
          >
            {scenarios
              .filter((s) => s.id !== (side === "a" ? b : a))
              .map((s) => (
                <SelectItem key={s.id}>{s.name}</SelectItem>
              ))}
          </Select>
        ))}
      </div>
      {months && (
        <p className="text-body-medium text-on-surface-variant">
          {months.count === 0
            ? t("noOverlap")
            : t("over", { from: month(months.from), to: month(months.to), count: months.count })}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p className="text-title-medium text-on-surface">
            {showCost
              ? t("summaryCost", {
                  fte: change(total.fteB - total.fteA, fte),
                  cost: change(total.costB - total.costA, (v) => money(v)),
                })
              : t("summary", { fte: change(total.fteB - total.fteA, fte) })}
          </p>
          <DataTable
            aria-label={t("tableLabel")}
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            defaultState={{ sort: { column: "team", direction: "ascending" } }}
            compactItem={(r) => ({
              headline: r.team,
              supporting: `${fte(r.fteA)} → ${fte(r.fteB)} ${t("fte")}`,
            })}
            labels={labels}
          />
        </>
      )}
    </section>
  );
}
