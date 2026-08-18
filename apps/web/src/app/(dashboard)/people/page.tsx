"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "@vkieu/mui";
import { AppBar } from "@/components/layout/app-bar";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/services";
import type { Person, CreatePersonRequest } from "@/services";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@vkieu/mui";
import { toast } from "sonner";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function PeoplePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePersonRequest>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });

  const { data, isLoading, isError, error, refetch } = usePeople({
    page,
    pageSize,
    search: search || undefined,
  });

  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const deleteMutation = useDeletePerson();

  const people = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  const resetForm = () => {
    setFormData({ fullName: "", email: "", phone: "", address: "", dateOfBirth: "" });
  };

  const openAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEdit = (person: Person) => {
    setFormData({
      fullName: person.fullName,
      email: person.email,
      phone: person.phone ?? "",
      address: person.address ?? "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split("T")[0] : "",
    });
    setEditPerson(person);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Person created successfully");
        setShowAddDialog(false);
        resetForm();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create person");
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson) return;
    updateMutation.mutate(
      { id: editPerson.id, ...formData },
      {
        onSuccess: () => {
          toast.success("Person updated successfully");
          setEditPerson(null);
          resetForm();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update person");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Person deleted successfully");
        setDeleteId(null);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete person");
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
            <h1 className="text-[28px] leading-9 font-normal text-foreground">People</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Manage people records across your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground mb-2">
              Unable to load people
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">
              {error?.message || "Something went wrong while fetching people data."}
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
          <h1 className="text-[28px] leading-9 font-normal text-foreground">People</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Manage people records across your organization.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Icon name="person_add" size={18} />
          Add Person
        </Button>
      </AppBar>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Search
          className="max-w-sm flex-1"
          value={search}
          onValueChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search by name or email..."
        />
        <Chip variant="filter" selected={false} leadingIcon="group">
          {data?.total ?? 0} people
        </Chip>
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
                    <Skeleton className="h-4 w-50" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-30" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && people.length === 0 && (
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-16 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/8 mb-6">
              <Icon name="people" size={40} className="text-primary" />
            </div>
            <h2 className="text-[22px] font-normal leading-7 text-foreground mb-2">
              No people yet
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6 max-w-sm">
              Get started by adding your first person record. You can import data or add them one by one.
            </p>
            <Button onClick={openAdd}>
              <Icon name="person_add" size={18} />
              Add Person
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && people.length > 0 && (
        <>
          {/* Table View (Desktop) */}
          <Card variant="elevated" className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={person.fullName} size="s" />
                          <span className="font-medium">{person.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{person.email}</TableCell>
                      <TableCell>{person.phone || "—"}</TableCell>
                      <TableCell>
                        {person.dateOfBirth
                          ? new Date(person.dateOfBirth).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full"
                            onClick={() => openEdit(person)}
                            aria-label={`Edit ${person.fullName}`}
                          >
                            <Icon name="edit" size={18} />
                          </Button>
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(person.id)}
                            aria-label={`Delete ${person.fullName}`}
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
            {people.map((person) => (
              <Card key={person.id} variant="elevated">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={person.fullName} size="l" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium leading-6 text-foreground truncate">
                      {person.fullName}
                    </p>
                    <p className="text-[14px] leading-5 text-muted-foreground truncate">
                      {person.email}
                    </p>
                    {person.phone && (
                      <p className="text-[12px] leading-4 text-muted-foreground mt-0.5">
                        {person.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="text"
                      size="xs"
                      className="rounded-full"
                      onClick={() => openEdit(person)}
                      aria-label={`Edit ${person.fullName}`}
                    >
                      <Icon name="edit" size={18} />
                    </Button>
                    <Button
                      variant="text"
                      size="xs"
                      className="rounded-full text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(person.id)}
                      aria-label={`Delete ${person.fullName}`}
                    >
                      <Icon name="delete" size={18} />
                    </Button>
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

      {/* Add Person Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
            <DialogDescription>
              Create a new person record in your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField
              variant="outlined"
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Phone"
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Address"
              value={formData.address ?? ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Date of Birth"
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <DialogFooter>
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

      {/* Edit Person Dialog */}
      <Dialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>
              Update the person&apos;s information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <TextField
              variant="outlined"
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Phone"
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Address"
              value={formData.address ?? ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="Date of Birth"
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="text"
                onClick={() => setEditPerson(null)}
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
              Are you sure you want to delete this person? This action cannot be undone.
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
