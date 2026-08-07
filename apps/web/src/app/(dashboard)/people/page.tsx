"use client";

import { useState } from "react";
import { DataTable, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { usePeople } from "@/services";
import type { Person } from "@/services";

const columns: Column<Person & Record<string, unknown>>[] = [
  { key: "fullName", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "phone", header: "Phone" },
];

export default function PeoplePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = usePeople({
    page,
    pageSize,
    search: search || undefined,
  });

  const people = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isError) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">People</h1>
            <p className="text-xs text-muted-foreground">
              Manage people records across your organization.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load people data"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">People</h1>
          <p className="text-xs text-muted-foreground">
            Manage people records across your organization.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add Person
        </button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search people..."
        />
      </div>

      <DataTable<Person & Record<string, unknown>>
        columns={columns}
        data={people as (Person & Record<string, unknown>)[]}
        isLoading={isLoading}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No people found"
      />
    </div>
  );
}
