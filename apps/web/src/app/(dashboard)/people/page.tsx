"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  SearchBar,
  TopAppBar,
  Card,
  TextField,
  AssistChip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TooltipTrigger,
  Tooltip,
  Checkbox,
  Divider,
  Button,
  IconButton,
  Select,
  SelectItem,
} from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
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
import { Skeleton, SkeletonGroup } from "@vkieu/mui/vk";
import { Avatar } from "@vkieu/mui/vk";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { escapeCsvField } from "@/lib/csv";
import { displayEmail, isPlaceholderEmail } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Core columns that always appear in the members table. */
const CORE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "position", label: "Position" },
  { key: "roles", label: "Roles" },
] as const;

// ─── Sortable Column Item ─────────────────────────────────────────────────────

function SortableColumnItem({
  id,
  label,
  isCore,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  isCore: boolean;
  selected: boolean;
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
        className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-on-surface-variant"
      >
        <Icon name="drag_indicator" size={14} />
      </button>
      <label className={`flex items-center gap-1.5 flex-1 min-w-0 ${isCore ? "" : "cursor-pointer hover:bg-on-surface/4"} rounded px-0.5`}>
        <Checkbox
          selected={selected}
          disabled={isCore}
          onSelectedChange={isCore ? undefined : () => onToggle()}
          aria-label={`Toggle ${label} column`}
          className="w-6 h-6 [&>span:first-of-type]:w-5 [&>span:first-of-type]:h-5"
        />
        <span className="text-body-small text-on-surface truncate">{label}</span>
      </label>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const toast = useToast();
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
  // Org hierarchy levels present in the data (e.g. Division, Tribe, Cluster,
  // Squad), ordered by their depth in the tree, become optional columns.
  const orgLevelTypes = useMemo(() => {
    const depth = new Map<string, number>(); // type -> shallowest index seen
    for (const p of people) {
      p.orgPath?.forEach((node, i) => {
        const prev = depth.get(node.type);
        if (prev === undefined || i < prev) depth.set(node.type, i);
      });
    }
    return [...depth.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([type]) => type);
  }, [people]);

  const allColumns = useMemo(() => {
    const core = CORE_COLUMNS.map((c) => ({ key: c.key, label: c.label, isCore: true }));
    const org = orgLevelTypes.map((t) => ({ key: `org:${t}`, label: t, isCore: false }));
    const meta = metadataKeys.map((k) => ({ key: `meta:${k}`, label: k, isCore: false }));
    return [...core, ...org, ...meta];
  }, [orgLevelTypes, metadataKeys]);

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

  // Show org hierarchy columns (Division, Tribe, …) by default the first time
  // they appear, so the full structure is visible without configuring columns.
  const orgDefaultsApplied = useRef(false);
  useEffect(() => {
    if (orgDefaultsApplied.current || orgLevelTypes.length === 0) return;
    orgDefaultsApplied.current = true;
    setVisibleMetaKeys((prev) => {
      const next = new Set(prev);
      for (const t of orgLevelTypes) next.add(`org:${t}`);
      return next;
    });
  }, [orgLevelTypes]);

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
        if (col.key === "email") return escapeCsvField(isPlaceholderEmail(p.email) ? "" : p.email);
        if (col.key === "position") return escapeCsvField(p.positionName ?? "");
        if (col.key === "roles") return escapeCsvField((p.roles ?? []).map((r) => r.name).join(", "));
        if (col.key.startsWith("org:")) {
          const type = col.key.slice(4);
          return escapeCsvField(p.orgPath?.find((n) => n.type === type)?.name ?? "");
        }
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
            <Avatar name={person.fullName} size="sm" decorative />
            <span className="font-medium">{person.fullName}</span>
          </div>
        );
      case "email":
        return isPlaceholderEmail(person.email) ? (
          <span className="text-on-surface-variant">No email</span>
        ) : (
          person.email
        );
      case "position":
        return person.positionName ?? "—";
      case "roles":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {person.isSuperAdmin && <AssistChip>Admin</AssistChip>}
            {(person.roles ?? []).map((r) => <AssistChip key={r.id}>{r.name}</AssistChip>)}
            {!person.isSuperAdmin && (person.roles ?? []).length === 0 && (
              <span className="text-body-small text-on-surface-variant">No role</span>
            )}
          </div>
        );
      default: {
        if (colKey.startsWith("org:")) {
          const type = colKey.slice(4);
          return person.orgPath?.find((n) => n.type === type)?.name ?? "—";
        }
        const metaKey = colKey.replace("meta:", "");
        return person.metadata?.[metaKey] ?? "—";
      }
    }
  };

  // ─── Error State ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <TopAppBar title={<h1 className="text-headline-medium">Members</h1>} subtitle="Manage workspace members and their roles." />
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-title-medium mb-2">Unable to load members</h2>
            <p className="text-body-medium text-on-surface-variant mb-6">
              {error?.message || "Something went wrong while fetching member data."}
            </p>
            <Button variant="filled" onClick={() => refetch()} leadingIcon={<Icon name="refresh" />}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Content ─────────────────────────────────────────────────────────
  return (
    <motion.div
      className="flex flex-col h-full min-h-0 gap-4"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Page Header */}
      <TopAppBar
        className="justify-between shrink-0"
        title={<h1 className="text-headline-medium">Members</h1>}
        subtitle={`${data?.total ?? 0} members · Manage workspace members and their roles.`}
        actions={
          <div className="flex items-center gap-2">
            <TooltipTrigger placement="bottom">
              <Button variant="tonal" onClick={handleExport} leadingIcon={<Icon name="download" />}>Export</Button>
              <Tooltip>Export visible columns to CSV</Tooltip>
            </TooltipTrigger>
            <Button variant="tonal" className="text-error" onClick={() => setShowDeleteAllDialog(true)} leadingIcon={<Icon name="delete_sweep" />}>Delete All</Button>
            <Button onClick={openAdd} leadingIcon={<Icon name="person_add" />}>Add Member</Button>
          </div>
        }
      />

      {/* Search + Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <SearchBar
          aria-label="Search"
            className="max-w-sm flex-1"
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Search by name or email..."
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Views */}
          <Select
            variant="outlined"
            label="View"
            selectedKey={selectedViewId}
            onSelectionChange={(key) => handleSelectView(key == null ? "" : String(key))}
            className="min-w-35"
          >
            {[
              <SelectItem key="">Default</SelectItem>,
              ...tableViews.map((v) => <SelectItem key={v.id}>{v.name}</SelectItem>),
            ]}
          </Select>

          {selectedViewId && (
            <TooltipTrigger placement="top">
              <IconButton variant="standard" size="xs" className="text-error" icon={<Icon name="delete" />} onClick={() => handleDeleteView(selectedViewId)} aria-label="Delete view" />
              <Tooltip>Delete this view</Tooltip>
            </TooltipTrigger>
          )}

          <TooltipTrigger placement="top">
            <Button variant="tonal" size="xs" onClick={() => setShowSaveViewDialog(true)} leadingIcon={<Icon name="save" />}>Save View</Button>
            <Tooltip>Save current column selection as a view</Tooltip>
          </TooltipTrigger>

          {/* Column Visibility */}
          <div className="relative">
            <TooltipTrigger placement="top">
              <Button variant="tonal" size="xs" onClick={() => setShowColumnToggle((v) => !v)} leadingIcon={<Icon name="view_column" />}>Columns</Button>
              <Tooltip>Toggle columns</Tooltip>
            </TooltipTrigger>

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
                            selected={col.isCore || visibleMetaKeys.has(key)}
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

      {/* Scrollable content region — fills remaining height so pagination stays pinned */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Loading State */}
      {isLoading && (
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              <SkeletonGroup label="Loading people">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" corner="full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-50" corner="extra-small" />
                    <Skeleton className="h-3 w-40" corner="extra-small" />
                  </div>
                  <Skeleton className="h-4 w-30" corner="extra-small" />
                </div>
              ))}
              </SkeletonGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && people.length === 0 && (
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/8 mb-4">
              <Icon name="people" size={24} className="text-primary" />
            </div>
            <h2 className="text-title-large mb-2">No members yet</h2>
            <p className="text-body-medium text-on-surface-variant mb-6 max-w-sm">
              Import your org data from a CSV in Settings, or add members one by one.
            </p>
            <div className="flex gap-3">
              <Link href="/admin/settings">
                <Button variant="tonal" leadingIcon={<Icon name="upload" />}>Import in Settings</Button>
              </Link>
              <Button variant="filled" onClick={openAdd} leadingIcon={<Icon name="person_add" />}>Add Member</Button>
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
                <AssistChip>{selectedIds.size} selected</AssistChip>
                <Button variant="tonal" onClick={() => setShowBatchRoleDialog(true)} leadingIcon={<Icon name="shield" />}>Assign Role</Button>
                <Button variant="text" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
              </CardContent>
            </Card>
          )}

          {/* Desktop Table */}
          <Card variant="elevated" className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 overflow-hidden">
            <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                      selected={people.length > 0 && selectedIds.size === people.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < people.length}
                      onSelectedChange={toggleSelectAll}
                      aria-label="Select all"
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
                        <Checkbox selected={selectedIds.has(person.id)} onSelectedChange={() => toggleSelect(person.id)} aria-label="Select row" />
                      </TableCell>
                      {visibleColumns.map((col) => <TableCell key={col.key}>{renderCell(person, col.key)}</TableCell>)}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <IconButton variant="standard" size="xs" icon={<Icon name="edit" />} onClick={() => openEdit(person)} aria-label={`Edit ${person.fullName}`} />
                          <IconButton variant="standard" size="xs" className="text-error hover:text-error" icon={<Icon name="delete" />} onClick={() => setDeleteId(person.id)} aria-label={`Delete ${person.fullName}`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="flex flex-col gap-4 md:hidden flex-1 min-h-0 overflow-y-auto">
            {people.map((person) => (
              <Card key={person.id} variant="elevated">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={person.fullName} size="lg" alt={person.fullName} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-title-medium truncate">{person.fullName}</h3>
                    <p className="text-body-medium text-on-surface-variant truncate">{displayEmail(person.email)}</p>
                    {person.orgUnitName && (
                      <p className="text-body-small text-on-surface-variant mt-0.5">{person.orgUnitName}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <IconButton variant="standard" size="xs" icon={<Icon name="edit" />} onClick={() => openEdit(person)} aria-label={`Edit ${person.fullName}`} />
                    <IconButton variant="standard" size="xs" className="text-error hover:text-error" icon={<Icon name="delete" />} onClick={() => setDeleteId(person.id)} aria-label={`Delete ${person.fullName}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination — pinned footer, always visible without scrolling */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between shrink-0 border-t border-outline-variant pt-3">
              <p className="text-body-medium text-on-surface-variant">
                Page {page} of {totalPages} · {data?.total ?? 0} total
              </p>
              <div className="flex gap-2">
                <Button variant="outlined" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} leadingIcon={<Icon name="chevron_left" />}>Previous</Button>
                <Button variant="outlined" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} trailingIcon={<Icon name="chevron_right" />}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}

      {/* Add Member */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <p className="mb-4">Add a new member to your workspace.</p>
          <form onSubmit={handleAdd} className="space-y-4" id="add-member-form">
            <TextField variant="outlined" label="Full Name" required className="w-full" value={formData.fullName} onChange={(value) => setFormData({ ...formData, fullName: value })} />
            <TextField variant="outlined" label="Email" type="email" required className="w-full" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
            <Select
              variant="outlined"
              label="Role"
              selectedKey={formData.roleId ?? ""}
              onSelectionChange={(key) => setFormData({ ...formData, roleId: key == null ? undefined : String(key) || undefined })}
            >
              {[
                <SelectItem key="">No role (basic access)</SelectItem>,
                ...roles.map((r) => <SelectItem key={r.id}>{r.name}</SelectItem>),
              ]}
            </Select>
            <TextField variant="outlined" label="Phone" type="tel" className="w-full" value={formData.phone ?? ""} onChange={(value) => setFormData({ ...formData, phone: value })} />
            <TextField variant="outlined" label="Address" className="w-full" value={formData.address ?? ""} onChange={(value) => setFormData({ ...formData, address: value })} />
            <TextField variant="outlined" label="Date of Birth" type="date" className="w-full" value={formData.dateOfBirth} onChange={(value) => setFormData({ ...formData, dateOfBirth: value })} />
          </form>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="text" onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button variant="filled" type="submit" form="add-member-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member */}
      <Dialog open={!!editPerson} onOpenChange={(open) => !open && setEditPerson(null)}>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <p className="mb-4">Update the member&apos;s information.</p>
          <form onSubmit={handleEdit} className="space-y-4" id="edit-member-form">
            <TextField variant="outlined" label="Full Name" required className="w-full" value={formData.fullName} onChange={(value) => setFormData({ ...formData, fullName: value })} />
            <TextField variant="outlined" label="Email" type="email" required className="w-full" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
            <TextField variant="outlined" label="Phone" type="tel" className="w-full" value={formData.phone ?? ""} onChange={(value) => setFormData({ ...formData, phone: value })} />
            <TextField variant="outlined" label="Address" className="w-full" value={formData.address ?? ""} onChange={(value) => setFormData({ ...formData, address: value })} />
            <TextField variant="outlined" label="Date of Birth" type="date" className="w-full" value={formData.dateOfBirth} onChange={(value) => setFormData({ ...formData, dateOfBirth: value })} />

            {editPerson && metadataKeys.length > 0 && (
              <>
                <Divider />
                <span className="text-label-medium text-on-surface-variant uppercase tracking-wide">Additional Fields</span>
                {metadataKeys.map((key) => (
                  <TextField key={key} variant="outlined" label={key} className="w-full" value={formMetadata[key] ?? ""} onChange={(value) => setFormMetadata({ ...formMetadata, [key]: value })} />
                ))}
              </>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="text" onClick={() => setEditPerson(null)}>Cancel</Button>
          <Button variant="filled" type="submit" form="edit-member-form" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Single Member */}
      <Dialog open={!!deleteId} onOpenChange={() => {}} icon={<Icon name="delete" />} role="alertdialog">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to remove this member? This action cannot be undone.</p>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="text" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="text" className="text-error" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Members */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog} icon={<Icon name="delete_sweep" />} role="alertdialog">
        <DialogTitle>Delete All Members</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to remove all members? This action cannot be undone.</p>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="text" onClick={() => setShowDeleteAllDialog(false)}>Cancel</Button>
          <Button variant="text" className="text-error" onClick={handleDeleteAll} disabled={deleteAllMutation.isPending}>
            {deleteAllMutation.isPending ? "Deleting..." : "Delete All Members"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save View */}
      <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
        <DialogTitle>Save Table View</DialogTitle>
        <DialogContent>
          <p className="mb-4">Save the current column selection as a named view.</p>
          <div className="space-y-3">
            <TextField variant="outlined" label="View Name" required className="w-full" value={newViewName} onChange={(value) => setNewViewName(value)} placeholder="e.g. Engineering View" />
            <div>
              <p className="text-body-small text-on-surface-variant mb-1">Visible columns:</p>
              <div className="flex flex-wrap gap-1">
                {visibleColumns.map((col) => <AssistChip key={col.key}>{col.label}</AssistChip>)}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="text" onClick={() => { setShowSaveViewDialog(false); setNewViewName(""); }}>Cancel</Button>
          <Button variant="filled" onClick={handleSaveView} disabled={createViewMutation.isPending}>
            {createViewMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Role Assignment */}
      <Dialog open={showBatchRoleDialog} onOpenChange={setShowBatchRoleDialog} icon={<Icon name="shield" />}>
        <DialogTitle>Assign Role</DialogTitle>
        <DialogContent>
          <p className="mb-4">Assign a role to {selectedIds.size} selected member{selectedIds.size !== 1 ? "s" : ""}.</p>
          <Select
            variant="outlined"
            label="Role"
            selectedKey={batchRoleId}
            onSelectionChange={(key) => setBatchRoleId(key == null ? "" : String(key))}
          >
            {roles.map((r) => (
              <SelectItem key={r.id}>{r.name}</SelectItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setShowBatchRoleDialog(false)}>Cancel</Button>
          <Button variant="filled" onClick={handleBatchAssignRole} disabled={!batchRoleId || assignRoleMutation.isPending}>
            {assignRoleMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
