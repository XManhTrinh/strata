"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/services";
import type { Employee, CreateEmployeeRequest } from "@/services";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chips";
import { TextField } from "@/components/ui/text-field";
import { Tooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
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
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
        <div className="flex gap-1">
          <Tooltip content="Edit">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row as Employee);
              }}
            >
              <Icon name="edit" size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(row.id);
              }}
            >
              <Icon name="delete" size={18} />
            </Button>
          </Tooltip>
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
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Employees</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              View and manage employee records with status tracking.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {error?.message || "Failed to load employee data"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Employees</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            View and manage employee records with status tracking.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Icon name="person_add" size={18} />
          Add Employee
        </Button>
      </AppBar>

      {/* Search + Filters */}
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
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <Chip
              key={opt}
              variant="filter"
              selected={statusFilter === opt}
              onClick={() => {
                setStatusFilter(opt);
                setPage(1);
              }}
            >
              {opt === "ALL" ? "All" : opt.replace("_", " ")}
            </Chip>
          ))}
        </div>
      </div>

      {/* DataTable */}
      <Card variant="outlined">
        <CardContent className="p-0">
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
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <AnimatedDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Add Employee</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Create a new employee record in your organization.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField
              variant="outlined"
              label="UIN"
              required
              value={formData.uin}
              onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Person ID"
              required
              value={formData.personId}
              onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Organization ID"
              required
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Department ID"
              value={formData.departmentId ?? ""}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Start Date"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
              >
                <SelectTrigger>
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
          <form onSubmit={handleEdit} className="space-y-4">
            <TextField
              variant="outlined"
              label="UIN"
              required
              value={formData.uin}
              onChange={(e) => setFormData({ ...formData, uin: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Person ID"
              required
              value={formData.personId}
              onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Organization ID"
              required
              value={formData.organizationId}
              onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Department ID"
              value={formData.departmentId ?? ""}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Start Date"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
              >
                <SelectTrigger>
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
    </motion.div>
  );
}
