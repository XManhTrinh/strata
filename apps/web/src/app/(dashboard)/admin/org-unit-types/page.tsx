"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  PageBar,
  Icon,
  Card,
  CardContent,
  Chip,
  Tooltip,
  TextField,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  List,
  ListItem,
  Divider,
} from "@vkieu/mui";
import { Button, IconButton } from "@vkieu/mui/buttons";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useOrgUnitTypes,
  useCreateOrgUnitType,
  useUpdateOrgUnitType,
  useArchiveOrgUnitType,
  useRestoreOrgUnitType,
  type AdminOrgUnitType,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ICON = "corporate_fare";
const DEFAULT_COLOR = "#3B82F6";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-48 hidden sm:block" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} variant="elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  onCreateClick,
}: {
  hasSearch: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
        <Icon name="label" size={40} className="text-primary" />
      </div>
      <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
        {hasSearch ? "No types match your search" : "No unit types yet"}
      </h2>
      <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6 max-w-xs">
        {hasSearch
          ? "Try a different search term or clear the search."
          : "Create your first organization unit type to start building your hierarchy."}
      </p>
      {!hasSearch && (
        <Button onClick={onCreateClick}>
          <Icon name="add" size={18} />
          Create Type
        </Button>
      )}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card variant="elevated" className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-12 px-8 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
          <Icon name="error" size={24} className="text-error" />
        </div>
        <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
          Unable to load types
        </h2>
        <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
          Something went wrong. Please try again.
        </p>
        <Button variant="tonal" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Type row (desktop table) ─────────────────────────────────────────────────

function TypeRow({
  row,
  onEdit,
  onArchive,
  onRestore,
}: {
  row: AdminOrgUnitType;
  onEdit: (type: AdminOrgUnitType) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const icon = row.icon || DEFAULT_ICON;
  const color = row.color || DEFAULT_COLOR;

  return (
    <TableRow className="cursor-pointer" onClick={() => onEdit(row)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-9 w-9 rounded-full shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>
              <Icon name={icon} size={18} />
            </span>
          </div>
          <span className="text-[14px] font-medium text-surface-foreground">{row.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-surface-variant-foreground">
        {row.description || "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-full border border-outline-variant"
            style={{ backgroundColor: color }}
          />
          <span className="text-[12px] text-surface-variant-foreground font-mono">{color}</span>
        </div>
      </TableCell>
      <TableCell>
        <Chip variant="filter" selected={!row.archived}>
          {row.archived ? "Archived" : "Active"}
        </Chip>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Tooltip content="Edit">
            <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => onEdit(row)}>
              <Icon name="edit" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={row.archived ? "Restore" : "Archive"}>
            <IconButton
              variant="standard"
              size="xs"
              aria-label={row.archived ? "Restore" : "Archive"}
              onClick={() => (row.archived ? onRestore(row.id) : onArchive(row.id))}
            >
              <Icon name={row.archived ? "unarchive" : "archive"} size={18} />
            </IconButton>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Type card (mobile) ───────────────────────────────────────────────────────

function TypeCard({
  row,
  onEdit,
  onArchive,
  onRestore,
}: {
  row: AdminOrgUnitType;
  onEdit: (type: AdminOrgUnitType) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const icon = row.icon || DEFAULT_ICON;
  const color = row.color || DEFAULT_COLOR;

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        <ListItem
          interactive
          onClick={() => onEdit(row)}
          leading={
            <div
              className="flex items-center justify-center h-10 w-10 rounded-full"
              style={{ backgroundColor: `${color}20` }}
            >
              <span style={{ color }}>
                <Icon name={icon} size={20} />
              </span>
            </div>
          }
          trailing={
            <div className="flex items-center gap-2">
              <Chip variant="filter" selected={!row.archived}>
                {row.archived ? "Archived" : "Active"}
              </Chip>
              <Tooltip content={row.archived ? "Restore" : "Archive"}>
                <IconButton
                  variant="standard"
                  size="xs"
                  aria-label={row.archived ? "Restore" : "Archive"}
                  onClick={(e) => {
                    e.stopPropagation();
                    row.archived ? onRestore(row.id) : onArchive(row.id);
                  }}
                >
                  <Icon name={row.archived ? "unarchive" : "archive"} size={18} />
                </IconButton>
              </Tooltip>
            </div>
          }
          lines={2}
          supporting={row.description || "No description"}
        >
          {row.name}
        </ListItem>
      </CardContent>
    </Card>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface TypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminOrgUnitType | null;
  formData: { name: string; description: string; icon: string; color: string };
  onFormChange: (data: { name: string; description: string; icon: string; color: string }) => void;
  onSubmit: () => void;
  isPending: boolean;
}

function TypeDialog({
  open,
  onOpenChange,
  editing,
  formData,
  onFormChange,
  onSubmit,
  isPending,
}: TypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent icon={editing ? "edit" : "label"}>
        <DialogHeader centered>
          <DialogTitle>{editing ? "Edit Type" : "Create Type"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the organization unit type details."
              : "Define a new type for your organization structure."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Name"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            placeholder="e.g., Department"
            onKeyDown={(e) => {
              if (e.key === "Enter" && formData.name.trim()) onSubmit();
            }}
          />
          <TextField
            variant="outlined"
            label="Description"
            value={formData.description}
            onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
            placeholder="Brief description of this type"
          />
          <div className="grid grid-cols-2 gap-4">
            <IconPicker
              value={formData.icon}
              onChange={(icon) => onFormChange({ ...formData, icon })}
              color={formData.color}
            />
            <ColorPicker
              value={formData.color}
              onChange={(color) => onFormChange({ ...formData, color })}
            />
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
            <div
              className="flex items-center justify-center h-10 w-10 rounded-full shrink-0"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              <span style={{ color: formData.color }}>
                <Icon name={formData.icon || DEFAULT_ICON} size={20} />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-surface-foreground truncate">
                {formData.name || "Type name"}
              </p>
              <p className="text-[12px] text-surface-variant-foreground truncate">
                {formData.description || "Description"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="text" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="text"
            onClick={onSubmit}
            disabled={!formData.name.trim() || isPending}
          >
            {isPending ? "Saving..." : editing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgUnitTypesPage() {
  const toast = useToast();
  const companyId = useCompanyId();

  // ── Local state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AdminOrgUnitType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: DEFAULT_ICON,
    color: DEFAULT_COLOR,
  });

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: orgUnitTypes = [], isLoading, error, refetch } = useOrgUnitTypes(companyId);
  const createMutation = useCreateOrgUnitType();
  const updateMutation = useUpdateOrgUnitType();
  const archiveMutation = useArchiveOrgUnitType();
  const restoreMutation = useRestoreOrgUnitType();

  // ── Derived ────────────────────────────────────────────────────────────
  const filteredTypes = useMemo(() => {
    if (!search) return orgUnitTypes;
    const lower = search.toLowerCase();
    return orgUnitTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        (t.description ?? "").toLowerCase().includes(lower),
    );
  }, [orgUnitTypes, search]);

  const activeCount = orgUnitTypes.filter((t) => !t.archived).length;

  // ── Handlers ───────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingType(null);
    setFormData({ name: "", description: "", icon: DEFAULT_ICON, color: DEFAULT_COLOR });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((type: AdminOrgUnitType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description ?? "",
      icon: type.icon ?? DEFAULT_ICON,
      color: type.color ?? DEFAULT_COLOR,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (editingType) {
      updateMutation.mutate(
        { companyId, id: editingType.id, ...formData },
        {
          onSuccess: () => {
            toast.success("Type updated");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to update type"),
        },
      );
    } else {
      createMutation.mutate(
        { companyId, ...formData },
        {
          onSuccess: () => {
            toast.success("Type created");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to create type"),
        },
      );
    }
  }, [editingType, formData, companyId, createMutation, updateMutation, toast]);

  const handleArchive = useCallback(
    (id: string) => {
      archiveMutation.mutate(
        { companyId, id },
        {
          onSuccess: () => toast.success("Type archived"),
          onError: (err) => toast.error(err.message || "Failed to archive type"),
        },
      );
    },
    [companyId, archiveMutation, toast],
  );

  const handleRestore = useCallback(
    (id: string) => {
      restoreMutation.mutate(
        { companyId, id },
        {
          onSuccess: () => toast.success("Type restored"),
          onError: (err) => toast.error(err.message || "Failed to restore type"),
        },
      );
    },
    [companyId, restoreMutation, toast],
  );

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <PageBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
              Organization Unit Types
            </h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Define the types of organizational units used in your company structure.
            </p>
          </div>
        </PageBar>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ── Page header ────────────────────────────────────────────────── */}
      <PageBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
            Organization Unit Types
          </h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Define the types of organizational units used in your company structure.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Icon name="add" size={18} />
          Create Type
        </Button>
      </PageBar>

      {/* ── Toolbar: search + count ────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Search
          className="max-w-sm"
          value={search}
          onValueChange={setSearch}
          placeholder="Search types..."
        />
        {!isLoading && activeCount > 0 && (
          <Chip variant="filter" selected className="shrink-0">
            {activeCount} active
          </Chip>
        )}
      </div>

      {/* ── Desktop table ──────────────────────────────────────────────── */}
      <Card variant="elevated" className="hidden md:block">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : filteredTypes.length === 0 ? (
            <EmptyState hasSearch={!!search} onCreateClick={openCreate} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((row) => (
                  <TypeRow
                    key={row.id}
                    row={row}
                    onEdit={openEdit}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Mobile cards ───────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <MobileCardSkeleton />
        ) : filteredTypes.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-0">
              <EmptyState hasSearch={!!search} onCreateClick={openCreate} />
            </CardContent>
          </Card>
        ) : (
          filteredTypes.map((row) => (
            <TypeCard
              key={row.id}
              row={row}
              onEdit={openEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))
        )}
      </div>

      {/* ── Create / Edit dialog ───────────────────────────────────────── */}
      <TypeDialog
        open={showModal}
        onOpenChange={setShowModal}
        editing={editingType}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </motion.div>
  );
}
