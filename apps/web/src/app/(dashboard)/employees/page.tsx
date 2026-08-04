"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface Employee {
  id: string;
  uin: string;
  name: string;
  department: string;
  position: string;
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "SUSPENDED";
  [key: string]: unknown;
}

const mockEmployees: Employee[] = [
  { id: "1", uin: "EMP-001", name: "Sarah Chen", department: "Engineering", position: "Senior Engineer", status: "ACTIVE" },
  { id: "2", uin: "EMP-002", name: "Marcus Johnson", department: "Product", position: "Product Manager", status: "ACTIVE" },
  { id: "3", uin: "EMP-003", name: "Emily Rodriguez", department: "Engineering", position: "Staff Engineer", status: "ON_LEAVE" },
  { id: "4", uin: "EMP-004", name: "David Park", department: "Design", position: "UX Designer", status: "ACTIVE" },
  { id: "5", uin: "EMP-005", name: "Aisha Patel", department: "Engineering", position: "Junior Engineer", status: "ACTIVE" },
  { id: "6", uin: "EMP-006", name: "James Wilson", department: "Finance", position: "Financial Analyst", status: "SUSPENDED" },
  { id: "7", uin: "EMP-007", name: "Lin Zhang", department: "Engineering", position: "Tech Lead", status: "ACTIVE" },
  { id: "8", uin: "EMP-008", name: "Olivia Thompson", department: "HR", position: "HR Manager", status: "TERMINATED" },
];

const statusVariant: Record<Employee["status"], "success" | "warning" | "error" | "info"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "error",
  SUSPENDED: "info",
};

const columns: Column<Employee>[] = [
  { key: "uin", header: "UIN", sortable: true },
  { key: "name", header: "Name", sortable: true },
  { key: "department", header: "Department", sortable: true },
  { key: "position", header: "Position" },
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

  const filteredEmployees = mockEmployees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.uin.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            onChange={setSearch}
            placeholder="Search employees..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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

      <DataTable<Employee>
        columns={columns}
        data={filteredEmployees}
        pageSize={10}
        emptyMessage="No employees found"
      />
    </div>
  );
}
