"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import {
  Search,
  Icon,
  Card,
  CardContent,
  TextField,
  Chip,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tooltip,
  Checkbox,
  Divider,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { AppBar } from "@/components/layout/app-bar";
import {
  usePeople,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  useDeleteAllMembers,
  useMetadataKeys,
  useTableViews,
  useCreateTableView,
  useDeleteTableView,
  useRoles,
  useAssignRole,
} from "@/services";
import type { Person, CreatePersonRequest } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
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
import { toast } from "sonner";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { escapeCsvField } from "@/lib/csv";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Core columns that always appear in the members table. */
const CORE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "orgUnit", label: "Org Unit" },
  { key: "position", label: "Position" },
  { key: "roles", label: "Roles" },
] as const;

// ─── Sortable Column Item ─────────────────────────────────────────────────────

function SortableColumnItem({
  id,
  label,
  isCore,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  isCore: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-2 h-7 rounded ${
        isDragging ? "bg-primary/10 shadow-sm" : ""
      } ${isCore ? "opacity-60" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-surface-variant-foreground/40 hover:text-surface-variant-foreground"
      >
        <Icon name="drag_indicator" size={14} />
      </button>
      <label className={`flex items-center gap-1.5 flex-1 min-w-0 ${isCore ? "" : "cursor-pointer hover:bg-surface-foreground/4"} rounded px-0.5`}>
        <Checkbox
          checked={checked}
          disabled={isCore}
          onCheckedChange={isCore ? undefined : onToggle}
          className="w-6 h-6 [&>span:first-of-type]:w-5 [&>span:first-of-type]:h-5"
        />
        <span className="text-[12px] text-surface-foreground truncate">{label}</span>
      </label>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const companyId = useCompanyId();

  // DnD sensors for column reordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Data queries ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = usePeople({ companyId, page, pageSize, search: debouncedSearch || undefined });

  const { data: metadataKeys = [] } = useMetadataKeys(companyId);
  const { data: roles = [] } = useRoles(companyId);
  const { data: tableViews = [] } = useTableViews(companyId, "members");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreatePerson(companyId);
  const updateMutation = useUpdatePerson(companyId);
  const deleteMutation = useDeletePerson(companyId);
  const deleteAllMutation = useDeleteAllMembers(companyId);
  const createViewMutation = useCreateTableView(companyId);
  const deleteViewMutation = useDeleteTableView(companyId);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<CreatePersonRequest>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });
  const [formMetadata, setFormMetadata] = useState<Record<string, string>>({});

  // ── Column visibility & order state ─────────────────────────────────────
  const [visibleMetaKeys, setVisibleMetaKeys] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>("");

  // ── Derived data ──────────────────────────────────────────────────────────
  const people = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  // ── Batch selection ───────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchRoleDialog, setShowBatchRoleDialog] = useState(false);
  const [batchRoleId, setBatchRoleId] = useState("");
  const assignRoleMutation = useAssignRole(companyId);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === people.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(people.map((p) => p.id)));
    }
  };

  const handleBatchAssignRole = async () => {
    if (!batchRoleId || selectedIds.size === 0) return;
    let successCount = 0;
    for (const personId of selectedIds) {
      try {
        await assignRoleMutation.mutateAsync({ personId, roleId: batchRoleId });
        successCount++;
      } catch {
        // skip failures (might already have the role)
      }
    }
    toast.success(`Role assigned to ${successCount} member${successCount !== 1 ? "s" : ""}`);
    setShowBatchRoleDialog(false);
    setBatchRoleId("");
    setSelectedIds(new Set());
  };

  // ── Column helpers ────────────────────────────────────────────────────────
  const allColumns = useMemo(() => {
    const core = CORE_COLUMNS.map((c) => ({ key: c.key, label: c.label, isCore: true }));
    const meta = metadataKeys.map((k) => ({ key: `meta:${k}`, label: k, isCore: false }));
    return [...core, ...meta];
  }, [metadataKeys]);

  // Initialize column order when metadata keys change
  useEffect(() => {
    setColumnOrder((prev) => {
      const allKeys = allColumns.map((c) => c.key);
      // Keep existing order, append any new columns
      const existing = prev.filter((k) => allKeys.includes(k));
      const newKeys = allKeys.filter((k) => !existing.includes(k));
      if (newKeys.length === 0 && existing.length === allKeys.length) return prev;
      return [...existing, ...newKeys];
    });
  }, [allColumns]);

  const visibleColumns = useMemo(() => {
    const visible = allColumns.filter((col) => col.isCore || visibleMetaKeys.has(col.key));
    // Sort by columnOrder
    const orderMap = new Map(columnOrder.map((key, idx) => [key, idx]));
    return [...visible].sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [allColumns, visibleMetaKeys, columnOrder]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData({ fullName: "", email: "", phone: "", address: "", dateOfBirth: "", roleId: undefined });
    setFormMetadata({});
  }, []);

  const openAdd = () => { resetForm(); setShowAddDialog(true); };

  const openEdit = (person: Person) => {
    setFormData({
      fullName: person.fullName,
      email: person.email,
      phone: person.phone ?? "",
      address: person.address ?? "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split("T")[0] : "",
    });
    setFormMetadata(person.metadata ?? {});
    setEditPerson(person);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => { toast.success("Member added successfully"); setShowAddDialog(false); resetForm(); },
      onError: (err) => toast.error(err.message || "Failed to add member"),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson) return;
    updateMutation.mutate(
      { id: editPerson.id, ...formData, metadata: formMetadata },
      {
        onSuccess: () => { toast.success("Member updated successfully"); setEditPerson(null); resetForm(); },
        onError: (err) => toast.error(err.message || "Failed to update member"),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success("Member removed successfully"); setDeleteId(null); },
      onError: (err) => { toast.error(err.message || "Failed to remove member"); setDeleteId(null); },
    });
  };

  const handleDeleteAll = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: (result) => { toast.success(`Removed ${result.removed} members`); setShowDeleteAllDialog(false); },
      onError: (err) => { toast.error(err.message || "Failed to remove members"); setShowDeleteAllDialog(false); },
    });
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (people.length === 0) { toast.error("No members to export"); return; }

    const headers = visibleColumns.map((c) => c.label);
    const rows = people.map((p) =>
      visibleColumns.map((col) => {
        if (col.key === "name") return escapeCsvField(p.fullName);
        if (col.key === "email") return escapeCsvField(p.email);
        if (col.key === "orgUnit") return escapeCsvField(p.orgUnitName ?? "");
        if (col.key === "position") return escapeCsvField(p.positionName ?? "");
        if (col.key === "roles") return escapeCsvField((p.roles ?? []).map((r) => r.name).join(", "));
        const metaKey = col.key.replace("meta:", "");
        return escapeCsvField(p.metadata?.[metaKey] ?? "");
      }),
    );

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `members-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${people.length} members`);
  };

  // ── Table Views ───────────────────────────────────────────────────────────

  const handleSelectView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (!viewId) { setVisibleMetaKeys(new Set()); return; }
    const view = tableViews.find((v) => v.id === viewId);
    if (view) setVisibleMetaKeys(new Set(view.columns.filter((c) => c.startsWith("meta:"))));
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) { toast.error("View name is required"); return; }
    createViewMutation.mutate(
      { name: newViewName.trim(), table: "members", columns: visibleColumns.map((c) => c.key) },
      {
        onSuccess: () => { toast.success("View saved"); setShowSaveViewDialog(false); setNewViewName(""); },
        onError: (err) => toast.error(err.message || "Failed to save view"),
      },
    );
  };

  const handleDeleteView = (viewId: string) => {
    deleteViewMutation.mutate(viewId, {
      onSuccess: () => {
        toast.success("View deleted");
        if (selectedViewId === viewId) { setSelectedViewId(""); setVisibleMetaKeys(new Set()); }
      },
      onError: (err) => toast.error(err.message || "Failed to delete view"),
    });
  };

  const toggleMetaColumn = (colKey: string) => {
    setVisibleMetaKeys((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) next.delete(colKey);
      else next.add(colKey);
      return next;
    });
  };

  // ── Cell renderer ─────────────────────────────────────────────────────────

  const renderCell = (person: Person, colKey: string) => {
    switch (colKey) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <Avatar name={person.fullName} size="s" />
            <span className="font-medium">{person.fullName}</span>
          </div>
        );
      case "email":
        return person.email;
      case "orgUnit":
        return person.orgUnitName ?? "—";
      case "position":
        return person.positionName ?? "—";
      case "roles":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {person.isSuperAdmin && <Chip variant="filter" selected>Admin</Chip>}
            {(person.roles ?? []).map((r) => <Chip key={r.id} variant="filter">{r.name}</Chip>)}
            {!person.isSuperAdmin && (person.roles ?? []).length === 0 && (
              <span className="text-[12px] text-muted-foreground">No role</span>
            )}
          </div>
        );
      default: {
        const metaKey = colKey.replace("meta:", "");
        return person.metadata?.[metaKey] ?? "—";
      }
    }
  };

  // ─── Error State ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-foreground">Members</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">Manage workspace members and their roles.</p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground mb-2">Unable to load members</h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">
              {error?.message || "Something went wrong while fetching member data."}
            </p>
            <Button variant="tonal" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Content ─────────────────────────────────────────────────────────
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
          <h1 className="text-[28px] leading-9 font-normal text-foreground">Members</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">{data?.total ?? 0} members · Manage workspace members and their roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Export visible columns to CSV">
            <Button variant="tonal" onClick={handleExport}>
              <Icon name="download" size={18} />Export
            </Button>
          </Tooltip>
          <Button variant="tonal" className="text-error" onClick={() => setShowDeleteAllDialog(true)}>
            <Icon name="delete_sweep" size={18} />Delete All
          </Button>
          <Button onClick={openAdd}>
            <Icon name="person_add" size={18} />Add Member
          </Button>
        </div>
      </AppBar>

      {/* Search + Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Search
            className="max-w-sm flex-1"
            value={search}
            onValueChange={(val) => setSearch(val)}
            placeholder="Search by name or email..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Views */}
          <Select
            variant="outlined"
            label="View"
            value={selectedViewId}
            onValueChange={handleSelectView}
            options={[
              { value: "", label: "Default" },
              ...tableViews.map((v) => ({ value: v.id, label: v.name })),
            ]}
            className="min-w-35"
          />

          {selectedViewId && (
            <Tooltip content="Delete this view">
              <Button variant="text" size="xs" className="rounded-full text-error" onClick={() => handleDeleteView(selectedViewId)}>
                <Icon name="delete" size={18} />
              </Button>
            </Tooltip>
          )}

          <Tooltip content="Save current column selection as a view">
            <Button variant="tonal" size="xs" onClick={() => setShowSaveViewDialog(true)}>
              <Icon name="save" size={18} />Save View
            </Button>
          </Tooltip>

          {/* Column Visibility */}
          <div className="relative">
            <Tooltip content="Toggle columns">
              <Button variant="tonal" size="xs" onClick={() => setShowColumnToggle((v) => !v)}>
                <Icon name="view_column" size={18} />Columns
              </Button>
            </Tooltip>

            {showColumnToggle && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnToggle(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-surface-container-low border border-outline-variant shadow-lg py-1">
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        setColumnOrder((prev) => {
                          const oldIndex = prev.indexOf(String(active.id));
                          const newIndex = prev.indexOf(String(over.id));
                          return arrayMove(prev, oldIndex, newIndex);
                        });
                      }
                    }}
                  >
                    <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                      {columnOrder.map((key) => {
                        const col = allColumns.find((c) => c.key === key);
                        if (!col) return null;
                        return (
                          <SortableColumnItem
                            key={key}
                            id={key}
                            label={col.label}
                            isCore={col.isCore}
                            checked={col.isCore || visibleMetaKeys.has(key)}
                            onToggle={() => toggleMetaColumn(key)}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </div>
              </>
            )}
          </div>
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
            <h2 className="text-[22px] font-normal leading-7 text-foreground mb-2">No members yet</h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6 max-w-sm">
              Import your org data from a CSV in Settings, or add members one by one.
            </p>
            <div className="flex gap-3">
              <Link href="/admin/settings">
                <Button variant="tonal">
                  <Icon name="upload" size={18} />Import in Settings
                </Button>
              </Link>
              <Button onClick={openAdd}>
                <Icon name="person_add" size={18} />Add Member
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && people.length > 0 && (
        <>
          {/* Batch Action Bar */}
          {selectedIds.size > 0 && (
            <Card variant="elevated" className="hidden md:block">
              <CardContent className="flex items-center gap-4 p-3">
                <Chip variant="filter" selected>{selectedIds.size} selected</Chip>
                <Button variant="tonal" onClick={() => setShowBatchRoleDialog(true)}>
                  <Icon name="shield" size={18} />Assign Role
                </Button>
                <Button variant="text" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
              </CardContent>
            </Card>
          )}

          {/* Desktop Table */}
          <Card variant="elevated" className="hidden md:block">
            <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={people.length > 0 && selectedIds.size === people.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < people.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    {visibleColumns.map((col) => <TableHead key={col.key}>{col.label}</TableHead>)}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id} className={selectedIds.has(person.id) ? "bg-primary/5" : ""}>
                      <TableCell className="w-10">
                        <Checkbox checked={selectedIds.has(person.id)} onCheckedChange={() => toggleSelect(person.id)} />
                      </TableCell>
                      {visibleColumns.map((col) => <TableCell key={col.key}>{renderCell(person, col.key)}</TableCell>)}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="text" size="xs" className="rounded-full" onClick={() => openEdit(person)} aria-label={`Edit ${person.fullName}`}>
                            <Icon name="edit" size={18} />
                          </Button>
                          <Button variant="text" size="xs" className="rounded-full text-destructive hover:text-destructive" onClick={() => setDeleteId(person.id)} aria-label={`Delete ${person.fullName}`}>
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

          {/* Mobile Card View */}
          <div className="flex flex-col gap-4 md:hidden">
            {people.map((person) => (
              <Card key={person.id} variant="elevated">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={person.fullName} size="l" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium leading-6 text-foreground truncate">{person.fullName}</p>
                    <p className="text-[14px] leading-5 text-muted-foreground truncate">{person.email}</p>
                    {person.orgUnitName && (
                      <p className="text-[12px] leading-4 text-muted-foreground mt-0.5">{person.orgUnitName}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="text" size="xs" className="rounded-full" onClick={() => openEdit(person)} aria-label={`Edit ${person.fullName}`}>
                      <Icon name="edit" size={18} />
                    </Button>
                    <Button variant="text" size="xs" className="rounded-full text-destructive hover:text-destructive" onClick={() => setDeleteId(person.id)} aria-label={`Delete ${person.fullName}`}>
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
                Page {page} of {totalPages} · {data?.total ?? 0} total
              </p>
              <div className="flex gap-2">
                <Button variant="outlined" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <Icon name="chevron_left" size={18} />Previous
                </Button>
                <Button variant="outlined" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next<Icon name="chevron_right" size={18} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}

      {/* Add Member */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent fullScreen>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add a new member to your workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField variant="outlined" label="Full Name" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            <TextField variant="outlined" label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <Select
              variant="outlined"
              label="Role"
              value={formData.roleId ?? ""}
              onValueChange={(value) => setFormData({ ...formData, roleId: value || undefined })}
              options={[{ value: "", label: "No role (basic access)" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
            />
            <TextField variant="outlined" label="Phone" type="tel" value={formData.phone ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField variant="outlined" label="Address" value={formData.address ?? ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <TextField variant="outlined" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            <DialogFooter>
              <Button type="button" variant="text" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button variant="text" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member */}
      <Dialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <DialogContent fullScreen>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update the member&apos;s information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <TextField variant="outlined" label="Full Name" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            <TextField variant="outlined" label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField variant="outlined" label="Phone" type="tel" value={formData.phone ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField variant="outlined" label="Address" value={formData.address ?? ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <TextField variant="outlined" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />

            {editPerson && metadataKeys.length > 0 && (
              <>
                <Divider />
                <p className="text-[13px] font-medium text-surface-variant-foreground uppercase tracking-wide">Additional Fields</p>
                {metadataKeys.map((key) => (
                  <TextField key={key} variant="outlined" label={key} value={formMetadata[key] ?? ""} onChange={(e) => setFormMetadata({ ...formMetadata, [key]: e.target.value })} />
                ))}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="text" onClick={() => setEditPerson(null)}>Cancel</Button>
              <Button variant="text" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Single Member */}
      <Dialog open={!!deleteId} onOpenChange={() => {}}>
        <DialogContent alert icon="delete">
          <DialogHeader centered>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to remove this member? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="text" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="text" className="text-error" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Members */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent alert icon="delete_sweep">
          <DialogHeader centered>
            <DialogTitle>Delete All Members</DialogTitle>
            <DialogDescription>Are you sure you want to remove all members? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="text" onClick={() => setShowDeleteAllDialog(false)}>Cancel</Button>
            <Button variant="text" className="text-error" onClick={handleDeleteAll} disabled={deleteAllMutation.isPending}>
              {deleteAllMutation.isPending ? "Deleting..." : "Delete All Members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save View */}
      <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Table View</DialogTitle>
            <DialogDescription>Save the current column selection as a named view.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <TextField variant="outlined" label="View Name" required value={newViewName} onChange={(e) => setNewViewName(e.target.value)} placeholder="e.g. Engineering View" />
            <div className="mt-3">
              <p className="text-[12px] text-muted-foreground mb-1">Visible columns:</p>
              <div className="flex flex-wrap gap-1">
                {visibleColumns.map((col) => <Chip key={col.key} variant="filter">{col.label}</Chip>)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="text" onClick={() => { setShowSaveViewDialog(false); setNewViewName(""); }}>Cancel</Button>
            <Button variant="text" onClick={handleSaveView} disabled={createViewMutation.isPending}>
              {createViewMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Role Assignment */}
      <Dialog open={showBatchRoleDialog} onOpenChange={setShowBatchRoleDialog}>
        <DialogContent icon="shield">
          <DialogHeader centered>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedIds.size} selected member{selectedIds.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <Select
            variant="outlined"
            label="Role"
            value={batchRoleId}
            onValueChange={setBatchRoleId}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
          <DialogFooter>
            <Button variant="text" onClick={() => setShowBatchRoleDialog(false)}>Cancel</Button>
            <Button variant="text" onClick={handleBatchAssignRole} disabled={!batchRoleId || assignRoleMutation.isPending}>
              {assignRoleMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
