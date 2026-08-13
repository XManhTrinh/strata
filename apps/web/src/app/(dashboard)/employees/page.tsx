"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "@vkieu/mui";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/services";
import type { Employee, CreateEmployeeRequest } from "@/services";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@vkieu/mui";
import { toast } from "sonner";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

const statusConfig: Record<
  Employee["status"],
  { label: string; icon: string }
> = {
  ACTIVE: { label: "Active", icon: "check_circle" },
  ON_LEAVE: { label: "On Leave", icon: "schedule" },
  TERMINATED: { label: "Terminated", icon: "cancel" },
  SUSPENDED: { label: "Suspended", icon: "pause_circle" },
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
      onError: (err) => {
        toast.error(err.message || "Failed to create employee");
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
        onError: (err) => {
          toast.error(err.message || "Failed to update employee");
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
      onError: (err) => {
        toast.error(err.message || "Failed to delete employee");
        setDeleteId(null);
      },
    });
  };

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-foreground">Employees</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              View and manage employee records with status tracking.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground mb-2">
              Unable to load employees
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">
              {error?.message || "Something went wrong while fetching employee data."}
            </p>
            <Button variant="tonal" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Content ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Page Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-foreground">Employees</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            View and manage employee records with status tracking.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Icon name="person_add" size={18} />
          Add Employee
        </Button>
      </AppBar>

      {/* Search + Status Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Search
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

      {/* Loading State */}
      {isLoading && (
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-45" />
                    <Skeleton className="h-3 w-30" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-25" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && employees.length === 0 && (
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-16 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/8 mb-6">
              <Icon name="badge" size={40} className="text-primary" />
            </div>
            <h2 className="text-[22px] font-normal leading-7 text-foreground mb-2">
              No employees found
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6 max-w-sm">
              {statusFilter !== "ALL"
                ? `No employees with status "${statusFilter.replace("_", " ")}" found. Try changing the filter.`
                : "Get started by adding your first employee record."}
            </p>
            <Button onClick={openAdd}>
              <Icon name="person_add" size={18} />
              Add Employee
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {!isLoading && employees.length > 0 && (
        <>
          {/* Table View (Desktop) */}
          <Card variant="elevated" className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>UIN</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={employee.person?.fullName ?? employee.uin}
                            size="s"
                          />
                          <div>
                            <p className="font-medium text-[14px] leading-5">
                              {employee.person?.fullName ?? "—"}
                            </p>
                            <p className="text-[12px] leading-4 text-muted-foreground">
                              {employee.person?.email ?? ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[13px]">
                        {employee.uin}
                      </TableCell>
                      <TableCell>{employee.departmentId ?? "—"}</TableCell>
                      <TableCell>
                        {employee.startDate
                          ? new Date(employee.startDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          variant="filter"
                          selected={employee.status === "ACTIVE"}
                          leadingIcon={statusConfig[employee.status].icon}
                        >
                          {statusConfig[employee.status].label}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full"
                            onClick={() => openEdit(employee)}
                            aria-label={`Edit ${employee.person?.fullName ?? employee.uin}`}
                          >
                            <Icon name="edit" size={18} />
                          </Button>
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(employee.id)}
                            aria-label={`Delete ${employee.person?.fullName ?? employee.uin}`}
                          >
                            <Icon name="delete" size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Card List View (Mobile) */}
          <div className="flex flex-col gap-4 md:hidden">
            {employees.map((employee) => (
              <Card key={employee.id} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={employee.person?.fullName ?? employee.uin}
                      size="l"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium leading-6 text-foreground truncate">
                        {employee.person?.fullName ?? "—"}
                      </p>
                      <p className="text-[14px] leading-5 text-muted-foreground">
                        UIN: {employee.uin}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Chip
                          variant="filter"
                          selected={employee.status === "ACTIVE"}
                          leadingIcon={statusConfig[employee.status].icon}
                        >
                          {statusConfig[employee.status].label}
                        </Chip>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="text"
                        size="xs"
                        className="rounded-full"
                        onClick={() => openEdit(employee)}
                        aria-label={`Edit ${employee.person?.fullName ?? employee.uin}`}
                      >
                        <Icon name="edit" size={18} />
                      </Button>
                      <Button
                        variant="text"
                        size="xs"
                        className="rounded-full text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(employee.id)}
                        aria-label={`Delete ${employee.person?.fullName ?? employee.uin}`}
                      >
                        <Icon name="delete" size={18} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[14px] leading-5 text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Icon name="chevron_left" size={18} />
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <Icon name="chevron_right" size={18} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Create a new employee record in your organization.
            </DialogDescription>
          </DialogHeader>
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="text"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button variant="text" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee&apos;s information.
            </DialogDescription>
          </DialogHeader>
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="text"
                onClick={() => setEditEmployee(null)}
              >
                Cancel
              </Button>
              <Button variant="text" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent icon="delete">
          <DialogHeader centered>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="text"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="text"
              className="text-error"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
