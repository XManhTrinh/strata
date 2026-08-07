"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/services";
import type { Employee, CreateEmployeeRequest } from "@/services";

type EmployeeRow = Employee & Record<string, unknown>;

const statusVariant: Record<Employee["status"], "success" | "warning" | "error" | "info"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "error",
  SUSPENDED: "info",
};

const statusOptions = ["ALL", "ACTIVE", "ON_LEAVE", "TERMINATED", "SUSPENDED"] as const;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    uin: "",
    personId: "",
    organizationId: "",
    departmentId: "",
    startDate: "",
    status: "ACTIVE",
  });

  const { data, isLoading, isError, error, refetch } = useEmployees({
    page,
    limit,
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : (statusFilter as Employee["status"]),
  });

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const employees = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

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
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row as Employee);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.id);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const resetForm = () => {
    setFormData({
      uin: "",
      personId: "",
      organizationId: "",
      departmentId: "",
      startDate: "",
      status: "ACTIVE",
    });
  };

  const openAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEdit = (employee: Employee) => {
    setFormData({
      uin: employee.uin,
      personId: employee.personId,
      organizationId: employee.organizationId,
      departmentId: employee.departmentId ?? "",
      startDate: employee.startDate ? employee.startDate.split("T")[0] : "",
      status: employee.status,
    });
    setEditEmployee(employee);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        setShowAddDialog(false);
        resetForm();
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee) return;
    updateMutation.mutate(
      { id: editEmployee.id, ...formData },
      {
        onSuccess: () => {
          setEditEmployee(null);
          resetForm();
        },
      }
    );
  };

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
          onClick={openAdd}
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

      {/* Add Employee Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add Employee</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label htmlFor="add-uin" className="block text-sm font-medium text-foreground mb-1">UIN</label>
                <input
                  id="add-uin"
                  type="text"
                  required
                  value={formData.uin}
                  onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-personId" className="block text-sm font-medium text-foreground mb-1">Person ID</label>
                <input
                  id="add-personId"
                  type="text"
                  required
                  value={formData.personId}
                  onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-orgId" className="block text-sm font-medium text-foreground mb-1">Organization ID</label>
                <input
                  id="add-orgId"
                  type="text"
                  required
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-deptId" className="block text-sm font-medium text-foreground mb-1">Department ID</label>
                <input
                  id="add-deptId"
                  type="text"
                  value={formData.departmentId ?? ""}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-startDate" className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                <input
                  id="add-startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-status" className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  id="add-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee["status"] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Dialog */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Edit Employee</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label htmlFor="edit-uin" className="block text-sm font-medium text-foreground mb-1">UIN</label>
                <input
                  id="edit-uin"
                  type="text"
                  required
                  value={formData.uin}
                  onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-personId" className="block text-sm font-medium text-foreground mb-1">Person ID</label>
                <input
                  id="edit-personId"
                  type="text"
                  required
                  value={formData.personId}
                  onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-orgId" className="block text-sm font-medium text-foreground mb-1">Organization ID</label>
                <input
                  id="edit-orgId"
                  type="text"
                  required
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-deptId" className="block text-sm font-medium text-foreground mb-1">Department ID</label>
                <input
                  id="edit-deptId"
                  type="text"
                  value={formData.departmentId ?? ""}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-startDate" className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                <input
                  id="edit-startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee["status"] })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditEmployee(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Confirm Delete</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
