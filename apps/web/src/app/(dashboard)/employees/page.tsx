"use client";

import { useState } from "react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/services";
import type { Employee, CreateEmployeeRequest } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogFooter,
  AnimatedDialogTitle,
  AnimatedDialogDescription,
} from "@/components/ui/animated-dialog";
import { toast } from "sonner";

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
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row as Employee);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.id);
            }}
          >
            Delete
          </Button>
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
        toast.success("Employee created successfully");
        setShowAddDialog(false);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create employee");
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
          toast.success("Employee updated successfully");
          setEditEmployee(null);
          resetForm();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update employee");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Employee deleted successfully");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete employee");
        setDeleteId(null);
      },
    });
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
          <Button onClick={() => refetch()}>Retry</Button>
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
        <Button onClick={openAdd}>Add Employee</Button>
      </AppBar>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          className="max-w-sm flex-1"
          value={search}
          onValueChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search employees..."
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "ALL" ? "All Statuses" : opt.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <AnimatedDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Add Employee</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Create a new employee record in your organization.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="add-uin">UIN</Label>
              <Input
                id="add-uin"
                type="text"
                required
                value={formData.uin}
                onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-personId">Person ID</Label>
              <Input
                id="add-personId"
                type="text"
                required
                value={formData.personId}
                onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-orgId">Organization ID</Label>
              <Input
                id="add-orgId"
                type="text"
                required
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-deptId">Department ID</Label>
              <Input
                id="add-deptId"
                type="text"
                value={formData.departmentId ?? ""}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-startDate">Start Date</Label>
              <Input
                id="add-startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
              >
                <SelectTrigger id="add-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AnimatedDialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </AnimatedDialogFooter>
          </form>
        </AnimatedDialogContent>
      </AnimatedDialog>

      {/* Edit Employee Dialog */}
      <AnimatedDialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Edit Employee</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Update the employee&apos;s information.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-uin">UIN</Label>
              <Input
                id="edit-uin"
                type="text"
                required
                value={formData.uin}
                onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-personId">Person ID</Label>
              <Input
                id="edit-personId"
                type="text"
                required
                value={formData.personId}
                onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-orgId">Organization ID</Label>
              <Input
                id="edit-orgId"
                type="text"
                required
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-deptId">Department ID</Label>
              <Input
                id="edit-deptId"
                type="text"
                value={formData.departmentId ?? ""}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AnimatedDialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditEmployee(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </AnimatedDialogFooter>
          </form>
        </AnimatedDialogContent>
      </AnimatedDialog>

      {/* Delete Confirmation Dialog */}
      <AnimatedDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AnimatedDialogContent className="sm:max-w-sm">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Confirm Delete</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Are you sure? This cannot be undone.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <AnimatedDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </AnimatedDialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}
