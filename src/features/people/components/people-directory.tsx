"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar } from "@windmorph/react-pro";
import { EmptyState } from "@windmorph/react-pro";
import {
  type ColumnDef,
  DataTable,
  type TableState,
  initialTableState,
} from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import { ViewsMenu } from "@/features/table-views/components/views-menu";
import type { TableView } from "@/features/table-views/types";
import {
  DIRECTORY_SORTS,
  type DirectoryParams,
  type DirectorySort,
  type DirectoryView,
  directorySearch,
  parseDirectoryView,
} from "../directory-params";
import type { DirectoryFilterOptions, DirectoryPerson } from "../types";
import { DirectoryFilters } from "./directory-filters";

const SEARCH_DELAY_MS = 300;

/**
 * The people directory: a server-mode DataTable whose search, filters, sort and page live in the
 * URL, so views can be shared and the database does the work. Typing waits for a pause.
 */
export function PeopleDirectory({
  people,
  total,
  params,
  options,
  views,
  viewId,
}: {
  people: DirectoryPerson[];
  total: number;
  params: DirectoryParams;
  options: DirectoryFilterOptions;
  views: TableView[];
  viewId: string | null;
}) {
  const t = useTranslations("people");
  const format = useFormatter();
  const labels = useDataTableLabels();
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(params);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const date = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium", timeZone: "UTC" }) : "";

  const columns: ColumnDef<DirectoryPerson>[] = [
    {
      id: "name",
      header: t("columns.name"),
      accessor: (p) => p.fullName,
      cell: (p) => (
        <span className="flex items-center gap-3">
          <Avatar name={p.fullName} src={p.avatarUrl ?? undefined} size="sm" decorative />
          {p.fullName}
        </span>
      ),
      isRowHeader: true,
      hideable: false,
      width: 240,
    },
    { id: "unit", header: t("columns.unit"), accessor: (p) => p.unitName, width: 180 },
    { id: "position", header: t("columns.position"), accessor: (p) => p.positionName, width: 180 },
    {
      id: "level",
      header: t("columns.level"),
      accessor: (p) => p.careerLevelName,
      sortable: false,
      width: 140,
    },
    {
      id: "type",
      header: t("columns.employmentType"),
      accessor: (p) => p.employmentTypeName,
      sortable: false,
      width: 150,
    },
    {
      id: "manager",
      header: t("columns.manager"),
      accessor: (p) => p.managerName,
      sortable: false,
      width: 180,
    },
    {
      id: "email",
      header: t("columns.email"),
      accessor: (p) => p.email,
      sortable: false,
      width: 240,
    },
    {
      id: "start_date",
      header: t("columns.startDate"),
      accessor: (p) => p.startDate,
      cell: (p) => date(p.startDate),
      width: 140,
    },
  ];

  const openView = views.find((v) => v.id === viewId);
  const saved = openView ? parseDirectoryView(openView.state) : null;
  const known = new Set(columns.map((c) => c.id));

  const [state, setState] = useState<TableState>(() =>
    initialTableState(columns, {
      ...(saved && {
        columnOrder: [
          ...saved.columns.columnOrder.filter((id) => known.has(id)),
          ...columns.map((c) => c.id).filter((id) => !saved.columns.columnOrder.includes(id)),
        ],
        hidden: saved.columns.hidden.filter((id) => known.has(id)),
        widths: saved.columns.widths,
      }),
      search: params.search,
      sort: { column: params.sort, direction: params.descending ? "descending" : "ascending" },
      page: { index: params.page, size: params.size },
    })
  );

  /** Keeps the open view in the URL while its filters change. */
  const withView = (search: string, id: string | null) =>
    id ? `${search}${search ? "&" : "?"}view=${id}` : search;

  function navigate(next: DirectoryParams) {
    setFilters(next);
    startTransition(() =>
      router.replace(`${pathname}${withView(directorySearch(next), viewId)}`, { scroll: false })
    );
  }

  // What would be saved now, and whether it differs from the open view.
  const { page: _page, ...currentParams } = { ...filters, search: state.search };
  const current: DirectoryView = {
    params: currentParams,
    columns: { columnOrder: state.columnOrder, hidden: state.hidden, widths: state.widths },
  };
  const dirty =
    saved !== null && JSON.stringify(saved) !== JSON.stringify(parseDirectoryView(current));

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function onStateChange(next: TableState) {
    setState(next);
    const sort = (DIRECTORY_SORTS as readonly string[]).includes(next.sort?.column ?? "")
      ? (next.sort!.column as DirectorySort)
      : "name";
    const wanted: DirectoryParams = {
      ...filters,
      search: next.search,
      sort,
      descending: next.sort?.direction === "descending",
      page: next.page.index,
      size: next.page.size,
    };
    clearTimeout(searchTimer.current);
    if (next.search !== filters.search) {
      searchTimer.current = setTimeout(() => navigate(wanted), SEARCH_DELAY_MS);
    } else {
      navigate(wanted);
    }
  }

  function onFilterChange(patch: Partial<DirectoryParams>) {
    setState((current) => ({ ...current, page: { ...current.page, index: 0 } }));
    navigate({ ...filters, search: state.search, ...patch, page: 0 });
  }

  return (
    <DataTable
      aria-label={t("title")}
      mode="server"
      columns={columns}
      rows={people}
      totalRows={total}
      getRowId={(p) => p.id}
      state={state}
      onStateChange={onStateChange}
      loading={pending}
      rowHref={(p) => `/w/${workspace.slug}/people/${p.id}`}
      filters={
        <>
          <ViewsMenu
            tableKey="people"
            views={views}
            currentId={viewId}
            dirty={dirty}
            state={current}
            query={directorySearch({ ...filters, search: state.search, page: 0 })}
            hrefFor={(view) =>
              view
                ? `${pathname}${withView(
                    directorySearch({ ...parseDirectoryView(view.state).params, page: 0 }),
                    view.id
                  )}`
                : // "Everyone": the plain table, without opening the default view again.
                  `${pathname}?status=current`
            }
          />
          <DirectoryFilters params={filters} options={options} onChange={onFilterChange} />
        </>
      }
      empty={
        <EmptyState
          titleAs="h2"
          icon={<Icon name="person_search" />}
          title={t("empty")}
          description={t("emptyHint")}
        />
      }
      compactItem={(p) => ({
        headline: p.fullName,
        supporting: [p.unitName, p.positionName].filter(Boolean).join(" · "),
        leading: <Avatar name={p.fullName} src={p.avatarUrl ?? undefined} size="sm" decorative />,
      })}
      labels={labels}
    />
  );
}
