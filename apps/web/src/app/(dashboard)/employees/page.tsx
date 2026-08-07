"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees } from "@/services";
import type { Employee } from "@/services";

type EmployeeRow = Employee & Record<string, unknown>;

const statusVariant: Record<Employee["status"], "success" | "warning" | "error" | "info"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "error",
  SUSPENDED: "info",
};

const columns: Column<EmployeeRow>[] = [
  { key: "uin", header: "UIN", sortable: true },
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (row) => (row.person?.fullName ?? "—"),
  },
  { key: "departmentId", header: "Department" },
  { key: "positionId", header: "Position" },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <Badge variant={statusVariant[row.status]}>
        {row.status.replace("_", " ")}
      </Badge>
    ),
  },
];

const statusOptions = ["ALL", "ACTIVE", "ON_LEAVE", "TERMINATED", "SUSPENDED"] as const;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error, refetch } = useEmployees({
    page,
    limit,
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : (statusFilter as Employee["status"]),
  });

  const employees = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isError) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Employees</h1>
            <p className="text-xs text-muted-foreground">
              View and manage employee records with status tracking.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load employee data"}
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
          <h1 className="text-lg font-semibold text-foreground">Employees</h1>
          <p className="text-xs text-muted-foreground">
            View and manage employee records with status tracking.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add Employee
        </button>
      </AppBar>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search employees..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-sm border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Filter by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "ALL" ? "All Statuses" : opt.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <DataTable<EmployeeRow>
        columns={columns}
        data={employees as EmployeeRow[]}
        isLoading={isLoading}
        pageSize={limit}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No employees found"
      />
    </div>
  );
}
