"use client";
import type React from "react";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {SearchBar,
  TopAppBar,Card,AssistChip,
  Checkbox,
  TextField,
  TooltipTrigger,
  Tooltip,
  List,
  ListItem,
  Dialog, DialogContent, DialogTitle, DialogActions,
  Button,
  IconButton,
  Select,
  SelectItem} from "@vkieu/mui";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton, SkeletonGroup } from "@vkieu/mui/vk";
import { useToast } from "@/hooks/use-toast";
import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useArchivePosition,
  useDeletePosition,
  useCareerLevels,
  useCreateCareerLevel,
  type AdminPosition,
  type CareerLevel,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

// Legacy compatibility type for interactive ListItem
// Legacy compatibility - TypeScript cast for interactive list items
const ListItemWithClick = ListItem as unknown as (props: React.ComponentProps<typeof ListItem> & { onClick?: () => void; selected?: boolean; }) => React.ReactElement;


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLevelRange(
  position: AdminPosition,
  levels: CareerLevel[],
): string {
  const min = levels.find((l) => l.id === position.minLevelId);
  const max = levels.find((l) => l.id === position.maxLevelId);
  if (min && max) {
    return min.id === max.id ? min.label : `${min.label} — ${max.label}`;
  }
  if (min) return `${min.label}+`;
  if (max) return `≤ ${max.label}`;
  return position.careerLevel != null ? `L${position.careerLevel}` : "—";
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface PositionFormData {
  name: string;
  description: string;
  minLevelId: string;
  maxLevelId: string;
  canHaveDirectReports: boolean;
}

interface LevelFormData {
  label: string;
  displayName: string;
  rank: number;
  track: string;
}

const EMPTY_POSITION_FORM: PositionFormData = {
  name: "",
  description: "",
  minLevelId: "",
  maxLevelId: "",
  canHaveDirectReports: false,
};

// ─── Loading skeletons ────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonGroup label="Loading positions">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" corner="extra-small" />
            <Skeleton className="h-4 w-20 hidden sm:block" corner="extra-small" />
            <Skeleton className="h-4 w-16 hidden sm:block" corner="extra-small" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-6 w-14" corner="full" />
              <Skeleton className="h-8 w-8" corner="full" />
            </div>
          </div>
        ))}
      </SkeletonGroup>
    </div>
  );
}

function MobileCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} variant="elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <SkeletonGroup label="Loading positions">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" corner="extra-small" />
                <Skeleton className="h-3 w-44" corner="extra-small" />
              </div>
              <Skeleton className="h-6 w-14" corner="full" />
            </SkeletonGroup>
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
        <Icon name="work" size={40} className="text-primary" />
      </div>
      <h2 className="text-headline-small text-on-surface mb-2">
        {hasSearch ? "No positions match your search" : "No positions yet"}
      </h2>
      <p className="text-body-medium text-on-surface-variant mb-6 max-w-xs">
        {hasSearch
          ? "Try a different search term or clear the search."
          : "Create your first position to define roles in your organization."}
      </p>
      {!hasSearch && (
        <Button onClick={onCreateClick} leadingIcon={<Icon name="add" />}>
          Create Position
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
        <h2 className="text-headline-small text-on-surface mb-2">
          Unable to load positions
        </h2>
        <p className="text-body-medium text-on-surface-variant mb-6">
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

// ─── Position row (desktop) ───────────────────────────────────────────────────

function PositionRow({
  row,
  levels,
  onEdit,
  onArchive,
  onDelete,
}: {
  row: AdminPosition;
  levels: CareerLevel[];
  onEdit: (p: AdminPosition) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const levelRange = formatLevelRange(row, levels);

  return (
    <TableRow className="cursor-pointer" onClick={() => onEdit(row)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/8 shrink-0">
            <Icon name="work" size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <span className="text-label-large text-on-surface block truncate">
              {row.name}
            </span>
            {row.description && (
              <span className="text-body-small text-on-surface-variant block truncate max-w-60">
                {row.description}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-body-medium text-on-surface">{levelRange}</span>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5">
          <Icon
            name={row.canHaveDirectReports ? "check_circle" : "remove_circle_outline"}
            size={18}
            className={row.canHaveDirectReports ? "text-tertiary" : "text-outline"}
          />
          <span className="text-body-medium text-on-surface">
            {row.canHaveDirectReports ? "Yes" : "No"}
          </span>
        </span>
      </TableCell>
      <TableCell>
        <AssistChip>
          {row.archived ? "Archived" : "Active"}
        </AssistChip>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <TooltipTrigger placement="top">
            <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => onEdit(row)} icon={<Icon name="edit" size={18} />} />
            <Tooltip>Edit</Tooltip>
          </TooltipTrigger>
          {row.archived ? (
            <TooltipTrigger placement="top">
              <IconButton
                variant="standard"
                size="xs"
                aria-label="Delete permanently"
                className="text-error"
                onClick={() => onDelete(row.id)}
                icon={<Icon name="delete_forever" size={18} />}
              />
              <Tooltip>Delete permanently</Tooltip>
            </TooltipTrigger>
          ) : (
            <TooltipTrigger placement="top">
              <IconButton variant="standard" size="xs" aria-label="Archive" onClick={() => onArchive(row.id)} icon={<Icon name="archive" size={18} />} />
              <Tooltip>Archive</Tooltip>
            </TooltipTrigger>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Position card (mobile) ───────────────────────────────────────────────────

function PositionCard({
  row,
  levels,
  onEdit,
  onArchive,
  onDelete,
}: {
  row: AdminPosition;
  levels: CareerLevel[];
  onEdit: (p: AdminPosition) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const levelRange = formatLevelRange(row, levels);
  const subtitle = `${levelRange} · ${row.canHaveDirectReports ? "Can manage" : "IC"}`;

  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        <ListItemWithClick
          onClick={() => onEdit(row)}
          leading={
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/8 shrink-0">
              <Icon name="work" size={20} className="text-primary" />
            </div>
          }
          trailing={
            <div className="flex items-center gap-2">
              <AssistChip>
                {row.archived ? "Archived" : "Active"}
              </AssistChip>
              <TooltipTrigger placement="top">
                <IconButton
                  variant="standard"
                  size="xs"
                  aria-label={row.archived ? "Delete" : "Archive"}
                  className={row.archived ? "text-error" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    row.archived ? onDelete(row.id) : onArchive(row.id);
                  }}
                  icon={<Icon name={row.archived ? "delete_forever" : "archive"} size={18} />}
                />
                <Tooltip>{row.archived ? "Delete" : "Archive"}</Tooltip>
              </TooltipTrigger>
            </div>
          }
          supportingText={subtitle}
        >
          {row.name}
        </ListItemWithClick>
      </CardContent>
    </Card>
  );
}

// ─── Position dialog ──────────────────────────────────────────────────────────

function PositionDialog({
  open,
  onOpenChange,
  editing,
  formData,
  onFormChange,
  onSubmit,
  isPending,
  levels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminPosition | null;
  formData: PositionFormData;
  onFormChange: (data: PositionFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  levels: CareerLevel[];
}) {
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.rank - b.rank),
    [levels],
  );

  const maxLevelOptions = useMemo(() => {
    if (!formData.minLevelId) return sortedLevels;
    const minLevel = levels.find((l) => l.id === formData.minLevelId);
    return minLevel ? sortedLevels.filter((l) => l.rank >= minLevel.rank) : sortedLevels;
  }, [sortedLevels, levels, formData.minLevelId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name={editing ? "edit" : "work"} />}>
      <DialogTitle>{editing ? "Edit Position" : "Create Position"}</DialogTitle>
      <DialogContent>
        <p className="text-sm text-on-surface-variant mb-4">
          {editing
            ? "Update position details, career level range, and reporting capabilities."
            : "Define a new position with career levels and reporting settings."}
        </p>
        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Name"
            className="w-full"
            value={formData.name}
            onChange={(value) => onFormChange({ ...formData, name: value })}
            placeholder="e.g., Senior Engineer"
            onKeyDown={(e) => {
              if (e.key === "Enter" && formData.name.trim()) onSubmit();
            }}
          />
          <TextField
            variant="outlined"
            label="Description"
            className="w-full"
            value={formData.description}
            onChange={(value) => onFormChange({ ...formData, description: value })}
            placeholder="Brief role description"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Min Level"
              selectedKey={formData.minLevelId || ""}
              onSelectionChange={(key) => {
                const newMin = key == null ? "" : String(key);
                const minLevel = levels.find((l) => l.id === newMin);
                const maxLevel = levels.find((l) => l.id === formData.maxLevelId);
                const shouldClearMax = minLevel && maxLevel && maxLevel.rank < minLevel.rank;
                onFormChange({
                  ...formData,
                  minLevelId: newMin,
                  ...(shouldClearMax ? { maxLevelId: "" } : {}),
                });
              }}
              placeholder="Select min level"
              variant="outlined"
            >
              {sortedLevels.map((level) => (
                <SelectItem key={level.id}>
                  {`${level.label} — ${level.displayName || level.label}`}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="Max Level"
              selectedKey={formData.maxLevelId || ""}
              onSelectionChange={(key) =>
                onFormChange({ ...formData, maxLevelId: key == null ? "" : String(key) })
              }
              placeholder="Select max level"
              variant="outlined"
            >
              {maxLevelOptions.map((level) => (
                <SelectItem key={level.id}>
                  {`${level.label} — ${level.displayName || level.label}`}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
            <Checkbox aria-label="Toggle"
  id="pos-reports"
              selected={formData.canHaveDirectReports}
              onSelectedChange={(checked) =>
                onFormChange({ ...formData, canHaveDirectReports: checked === true })
              }
            />
            <label htmlFor="pos-reports" className="text-body-medium text-on-surface cursor-pointer select-none">
              Can have direct reports
            </label>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
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
      </DialogActions>
    </Dialog>
  );
}

// ─── Career level dialog ──────────────────────────────────────────────────────

function CareerLevelDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: LevelFormData;
  onFormChange: (data: LevelFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name="trending_up" />}>
      <DialogTitle>Add Career Level</DialogTitle>
      <DialogContent>
        <p className="text-sm text-on-surface-variant mb-4">
          Define a new career level in your company&apos;s leveling scheme.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              variant="outlined"
              label="Label"
              className="w-full"
              value={formData.label}
              onChange={(value) => onFormChange({ ...formData, label: value })}
              placeholder="e.g., L3, M2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && formData.label.trim()) onSubmit();
              }}
            />
            <TextField
              variant="outlined"
              label="Display Name"
              className="w-full"
              value={formData.displayName}
              onChange={(value) => onFormChange({ ...formData, displayName: value })}
              placeholder="e.g., Senior"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              variant="outlined"
              label="Rank"
              className="w-full"
              type="number"
              value={String(formData.rank)}
              onChange={(value) => onFormChange({ ...formData, rank: Number(value) })}
              placeholder="Sort order"
            />
            <Select
              label="Track"
              selectedKey={formData.track}
              onSelectionChange={(key) => onFormChange({ ...formData, track: key == null ? "" : String(key) })}
              placeholder="Track (optional)"
              variant="outlined"
            >
              <SelectItem key="IC">Individual Contributor</SelectItem>
              <SelectItem key="Management">Management</SelectItem>
            </Select>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="text"
          onClick={onSubmit}
          disabled={!formData.label.trim() || isPending}
        >
          {isPending ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PositionsPage() {
  const toast = useToast();
  const companyId = useCompanyId();
  const reduced = useReducedMotionContext();

  // ── Local state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<AdminPosition | null>(null);
  const [formData, setFormData] = useState<PositionFormData>(EMPTY_POSITION_FORM);
  const [levelFormData, setLevelFormData] = useState<LevelFormData>({
    label: "",
    displayName: "",
    rank: 1,
    track: "",
  });

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: positions = [], isLoading, error, refetch } = usePositions(companyId);
  const { data: careerLevelScheme } = useCareerLevels(companyId);
  const levels = careerLevelScheme?.levels ?? [];
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const archiveMutation = useArchivePosition();
  const deleteMutation = useDeletePosition();
  const createLevelMutation = useCreateCareerLevel();

  // ── Derived ────────────────────────────────────────────────────────────
  const filteredPositions = useMemo(() => {
    if (!search) return positions;
    const lower = search.toLowerCase();
    return positions.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description ?? "").toLowerCase().includes(lower),
    );
  }, [positions, search]);

  const activeCount = positions.filter((p) => !p.archived).length;

  // ── Handlers ───────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingPosition(null);
    setFormData(EMPTY_POSITION_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((position: AdminPosition) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description ?? "",
      minLevelId: position.minLevelId ?? "",
      maxLevelId: position.maxLevelId ?? "",
      canHaveDirectReports: position.canHaveDirectReports,
    });
    setShowModal(true);
  }, []);

  const openAddLevel = useCallback(() => {
    const nextRank = levels.length > 0 ? Math.max(...levels.map((l) => l.rank)) + 1 : 1;
    setLevelFormData({ label: "", displayName: "", rank: nextRank, track: "" });
    setShowLevelModal(true);
  }, [levels]);

  const handleSubmit = useCallback(() => {
    if (editingPosition) {
      updateMutation.mutate(
        { companyId, id: editingPosition.id, ...formData },
        {
          onSuccess: () => {
            toast.success("Position updated");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to update position"),
        },
      );
    } else {
      createMutation.mutate(
        { companyId, ...formData },
        {
          onSuccess: () => {
            toast.success("Position created");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to create position"),
        },
      );
    }
  }, [editingPosition, formData, companyId, createMutation, updateMutation, toast]);

  const handleArchive = useCallback(
    (id: string) => {
      archiveMutation.mutate(
        { companyId, id },
        {
          onSuccess: () => toast.success("Position archived"),
          onError: (err) => toast.error(err.message || "Failed to archive position"),
        },
      );
    },
    [companyId, archiveMutation, toast],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(
        { companyId, id },
        {
          onSuccess: () => toast.success("Position deleted"),
          onError: (err) => toast.error(err.message || "Failed to delete position"),
        },
      );
    },
    [companyId, deleteMutation, toast],
  );

  const handleCreateLevel = useCallback(() => {
    createLevelMutation.mutate(
      {
        companyId,
        label: levelFormData.label,
        displayName: levelFormData.displayName || undefined,
        rank: levelFormData.rank,
        track: levelFormData.track || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Career level created");
          setShowLevelModal(false);
        },
        onError: (err) => toast.error(err.message || "Failed to create career level"),
      },
    );
  }, [levelFormData, companyId, createLevelMutation, toast]);

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <TopAppBar
          title={<h1 className="text-headline-medium">Positions</h1>}
          subtitle="Configure positions with career levels and reporting capabilities."
        />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ── Page header ────────────────────────────────────────────────── */}
      <TopAppBar
        className="justify-between"
        title={<h1 className="text-headline-medium">Positions</h1>}
        subtitle="Configure positions with career levels and reporting capabilities."
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="tonal" onClick={openAddLevel} leadingIcon={<Icon name="trending_up" />}>
              Add Level
            </Button>
            <Button onClick={openCreate} leadingIcon={<Icon name="add" />}>
              Create Position
            </Button>
          </div>
        }
      />

      {/* ── Toolbar: search + count ────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <SearchBar
          aria-label="Search"
          className="max-w-sm"
          value={search}
          onChange={setSearch}
          placeholder="Search positions..."
        />
        {!isLoading && activeCount > 0 && (
          <AssistChip className="shrink-0">
            {activeCount} active
          </AssistChip>
        )}
      </div>

      {/* ── Desktop table ──────────────────────────────────────────────── */}
      <Card variant="elevated" className="hidden md:block">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : filteredPositions.length === 0 ? (
            <EmptyState hasSearch={!!search} onCreateClick={openCreate} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Level Range</TableHead>
                  <TableHead>Direct Reports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((row) => (
                  <PositionRow
                    key={row.id}
                    row={row}
                    levels={levels}
                    onEdit={openEdit}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
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
        ) : filteredPositions.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-0">
              <EmptyState hasSearch={!!search} onCreateClick={openCreate} />
            </CardContent>
          </Card>
        ) : (
          filteredPositions.map((row) => (
            <PositionCard
              key={row.id}
              row={row}
              levels={levels}
              onEdit={openEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* ── Position dialog ────────────────────────────────────────────── */}
      <PositionDialog
        open={showModal}
        onOpenChange={setShowModal}
        editing={editingPosition}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        levels={levels}
      />

      {/* ── Career level dialog ────────────────────────────────────────── */}
      <CareerLevelDialog
        open={showLevelModal}
        onOpenChange={setShowLevelModal}
        formData={levelFormData}
        onFormChange={setLevelFormData}
        onSubmit={handleCreateLevel}
        isPending={createLevelMutation.isPending}
      />
    </motion.div>
  );
}
