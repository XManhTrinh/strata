"use client";

import { useState } from "react";
import { DataTable, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/services";
import type { Person, CreatePersonRequest } from "@/services";

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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row as Person);
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
        setShowAddDialog(false);
        resetForm();
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
          setEditPerson(null);
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
          onClick={openAdd}
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
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add Person</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label htmlFor="add-fullName" className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  id="add-fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-email" className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  id="add-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  id="add-phone"
                  type="tel"
                  value={formData.phone ?? ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-address" className="block text-sm font-medium text-foreground mb-1">Address</label>
                <input
                  id="add-address"
                  type="text"
                  value={formData.address ?? ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="add-dob" className="block text-sm font-medium text-foreground mb-1">Date of Birth</label>
                <input
                  id="add-dob"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
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

      {/* Edit Person Dialog */}
      {editPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Edit Person</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label htmlFor="edit-fullName" className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  id="edit-fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  id="edit-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone ?? ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-address" className="block text-sm font-medium text-foreground mb-1">Address</label>
                <input
                  id="edit-address"
                  type="text"
                  value={formData.address ?? ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="edit-dob" className="block text-sm font-medium text-foreground mb-1">Date of Birth</label>
                <input
                  id="edit-dob"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditPerson(null)}
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
