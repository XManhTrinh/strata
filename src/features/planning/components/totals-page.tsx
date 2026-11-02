"use client";

import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Select, SelectItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { type ColumnDef, DataTable } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import type { TotalsMeasure, TotalsTable } from "../totals";
import type { TotalsQuery, TotalsView } from "../totals-query";

type Row = TotalsTable["rows"][number];

/** FTE, headcount or cost by team (opening teams to see the teams under them) or custom field. */
export function TotalsPage({
  view,
  currency,
  canSeeCost,
}: {
  view: TotalsView;
  currency: string;
  canSeeCost: boolean;
}) {
  const t = useTranslations("totals");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const labels = useDataTableLabels();
  const { query, table } = view;

  const href = (change: Partial<TotalsQuery>, base = pathname) => {
    const next = { ...query, scenarioId: view.scenario?.id ?? null, ...change };
    const params = new URLSearchParams();
    if (next.scenarioId) params.set("scenario", next.scenarioId);
    params.set("by", next.by);
    if (next.unitId && next.by === "unit") params.set("unit", next.unitId);
    params.set("measure", next.measure);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    return `${base}?${params}`;
  };
  const go = (change: Partial<TotalsQuery>) => router.push(href(change));

  if (!view.scenario) {
    return (
      <EmptyState
        titleAs="h2"
        icon={<Icon name="table_chart" />}
        title={t("noScenarioTitle")}
        description={t("noScenario")}
      />
    );
  }

  const month = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const show = (n: number | null) =>
    n === null
      ? ""
      : query.measure === "cost"
        ? format.number(n, { style: "currency", currency, maximumFractionDigits: 0 })
        : format.number(n, { maximumFractionDigits: 2 });
  const fields = [...view.fields].sort(
    (a, b) => Number(b.id === view.costSplitFieldId) - Number(a.id === view.costSplitFieldId)
  );
  const opens = (row: Row) =>
    query.by === "unit" &&
    row.id !== (query.unitId ?? view.trail.at(-1)?.id) &&
    view.parents.includes(row.id);

  const columns: ColumnDef<Row>[] = [
    {
      id: "group",
      header:
        query.by === "unit"
          ? t("team")
          : (view.fields.find((f) => f.id === query.by)?.label ?? t("group")),
      accessor: (r) => r.label,
      cell: (r) => r.label || t("noValue"),
      isRowHeader: true,
      sortable: true,
      hideable: false,
    },
    ...table.months.map((m, i): ColumnDef<Row> => ({
      id: m,
      header: month(m),
      accessor: (r) => r.values[i] ?? null,
      cell: (r) => show(r.values[i] ?? null),
      type: query.measure === "cost" ? "currency" : "number",
      align: "end",
      sortable: true,
    })),
    {
      id: "summary",
      header: t(query.measure === "cost" ? "total" : "average"),
      accessor: (r) => r.summary,
      cell: (r) => show(r.summary),
      type: query.measure === "cost" ? "currency" : "number",
      align: "end",
      sortable: true,
    },
  ];

  const measures: TotalsMeasure[] = canSeeCost
    ? ["fte", "headcount", "cost"]
    : ["fte", "headcount"];

  return (
    <section aria-labelledby="totals-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="totals-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        <Button
          variant="outlined"
          leadingIcon={<Icon name="download" />}
          href={href({}, `${pathname}/export`)}
          download
        >
          {t("export")}
        </Button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          searchable={view.scenarios.length > 7}
          labels={{ search: t("scenario") }}
          className="w-full"
          label={t("scenario")}
          value={view.scenario.id}
          onChange={(key) => key != null && go({ scenarioId: String(key), from: null, to: null })}
        >
          {view.scenarios.map((s) => (
            <SelectItem key={s.id}>{s.name}</SelectItem>
          ))}
        </Select>
        <Select
          searchable={fields.length + 1 > 7}
          labels={{ search: t("groupBy") }}
          className="w-full"
          label={t("groupBy")}
          value={query.by}
          onChange={(key) => key != null && go({ by: String(key), unitId: null })}
        >
          {[
            <SelectItem key="unit">{t("byTeam")}</SelectItem>,
            ...fields.map((f) => <SelectItem key={f.id}>{f.label}</SelectItem>),
          ]}
        </Select>
        <Select
          className="w-full"
          label={t("measure")}
          value={query.measure}
          onChange={(key) => key != null && go({ measure: key as TotalsMeasure })}
        >
          {measures.map((m) => (
            <SelectItem key={m}>{t(`measures.${m}`)}</SelectItem>
          ))}
        </Select>
        {(["from", "to"] as const).map((end) => (
          <Select
            searchable={view.scenarioMonths.length > 7}
            labels={{ search: t(end) }}
            key={end}
            className="w-full"
            label={t(end)}
            value={query[end]}
            onChange={(key) => key != null && go({ [end]: String(key) })}
          >
            {view.scenarioMonths.map((m) => (
              <SelectItem key={m}>{month(m)}</SelectItem>
            ))}
          </Select>
        ))}
      </div>
      {query.by === "unit" && view.trail.length > 0 && (
        <nav aria-label={t("trail")} className="flex flex-wrap items-center gap-1">
          <Button variant="text" href={href({ unitId: null })}>
            {t("allTeams")}
          </Button>
          {view.trail.map((u, i) => (
            <span key={u.id} className="flex items-center gap-1">
              <Icon name="chevron_right" />
              {i === view.trail.length - 1 ? (
                <span className="text-title-small text-on-surface px-3" aria-current="page">
                  {u.name}
                </span>
              ) : (
                <Button variant="text" href={href({ unitId: u.id })}>
                  {u.name}
                </Button>
              )}
            </span>
          ))}
        </nav>
      )}
      <p className="text-body-medium text-on-surface-variant">
        {t(query.by === "unit" ? "introTeams" : "introField", {
          measure: t(`measures.${query.measure}`).toLowerCase(),
        })}
      </p>
      {table.rows.length === 0 ? (
        <p className="text-body-large text-on-surface-variant">{t("empty")}</p>
      ) : (
        <DataTable
          aria-label={t("tableLabel", { scenario: view.scenario.name })}
          columns={columns}
          rows={table.rows}
          getRowId={(r) => r.id || "none"}
          defaultState={{ sort: [{ column: "group", direction: "ascending" }] }}
          rowHref={(r) => (opens(r) ? href({ unitId: r.id }) : "")}
          compactItem={(r) => ({
            headline: r.label || t("noValue"),
            supporting: `${t(query.measure === "cost" ? "total" : "average")}: ${show(r.summary)}`,
          })}
          labels={labels}
        />
      )}
    </section>
  );
}
