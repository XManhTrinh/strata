"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/services";
import type { Person, CreatePersonRequest } from "@/services";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
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
        <div className="flex gap-1">
          <Tooltip content="Edit">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row as Person);
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
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">People</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Manage people records across your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {error?.message || "Failed to load people data"}
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
          <h1 className="text-[22px] leading-7 font-normal text-foreground">People</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Manage people records across your organization.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Icon name="person_add" size={18} />
          Add Person
        </Button>
      </AppBar>

      {/* Search */}
      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder="Search people..."
      />

      {/* DataTable */}
      <Card variant="outlined">
        <CardContent className="p-0">
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
        </CardContent>
      </Card>

      {/* Add Person Dialog */}
      <AnimatedDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Add Person</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Create a new person record in your organization.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
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
    </motion.div>
  );
}
