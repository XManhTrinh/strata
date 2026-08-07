"use client";

import { useState } from "react";
import { DataTable, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/services";
import type { Person, CreatePersonRequest } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogFooter,
  AnimatedDialogTitle,
  AnimatedDialogDescription,
} from "@/components/ui/animated-dialog";
import { toast } from "sonner";

type PersonRow = Person & Record<string, unknown>;

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

  const columns: Column<PersonRow>[] = [
    { key: "fullName", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "phone", header: "Phone" },
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
              openEdit(row as Person);
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
      onError: (error) => {
        toast.error(error.message || "Failed to create person");
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
        onError: (error) => {
          toast.error(error.message || "Failed to update person");
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
      onError: (error) => {
        toast.error(error.message || "Failed to delete person");
        setDeleteId(null);
      },
    });
  };

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
          <Button onClick={() => refetch()}>Retry</Button>
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
        <Button onClick={openAdd}>Add Person</Button>
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

      <DataTable<PersonRow>
        columns={columns}
        data={people as PersonRow[]}
        isLoading={isLoading}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No people found"
      />

      {/* Add Person Dialog */}
      <AnimatedDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Add Person</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Create a new person record in your organization.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="add-fullName">Full Name</Label>
              <Input
                id="add-fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                type="tel"
                value={formData.phone ?? ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-address">Address</Label>
              <Input
                id="add-address"
                type="text"
                value={formData.address ?? ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-dob">Date of Birth</Label>
              <Input
                id="add-dob"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
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

      {/* Edit Person Dialog */}
      <AnimatedDialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Edit Person</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Update the person&apos;s information.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone ?? ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                type="text"
                value={formData.address ?? ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-dob">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <AnimatedDialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditPerson(null)}
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
