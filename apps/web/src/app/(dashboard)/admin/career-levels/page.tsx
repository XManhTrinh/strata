"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "@vkieu/mui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@vkieu/mui/buttons";
import { IconButton } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@vkieu/mui";
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
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@vkieu/mui";
import { toast } from "sonner";
import {
  useCareerLevels,
  useCreateCareerLevel,
  useUpdateCareerLevel,
  useDeleteCareerLevel,
  COMPANY_ID,
  type CareerLevel,
} from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function CareerLevelsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLevel, setDeletingLevel] = useState<CareerLevel | null>(null);
  const [editingLevel, setEditingLevel] = useState<CareerLevel | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    displayName: "",
    rank: 1,
    track: "",
  });

  const { data: scheme, isLoading, error, refetch } = useCareerLevels(COMPANY_ID);
  const levels = scheme?.levels ?? [];
  const createMutation = useCreateCareerLevel();
  const updateMutation = useUpdateCareerLevel();
  const deleteMutation = useDeleteCareerLevel();

  const sortedLevels = levels
    .filter(
      (l) =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        (l.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.track || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.rank - b.rank);

  const openCreate = () => {
    setEditingLevel(null);
    const nextRank = levels.length > 0 ? Math.max(...levels.map((l) => l.rank)) + 1 : 1;
    setFormData({ label: "", displayName: "", rank: nextRank, track: "" });
    setShowModal(true);
  };

  const openEdit = (level: CareerLevel) => {
    setEditingLevel(level);
    setFormData({
      label: level.label,
      displayName: level.displayName || "",
      rank: level.rank,
      track: level.track || "",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingLevel) {
      updateMutation.mutate(
        {
          companyId: COMPANY_ID,
          levelId: editingLevel.id,
          label: formData.label,
          displayName: formData.displayName || undefined,
          rank: formData.rank,
          track: formData.track || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Career level updated");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update career level");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          companyId: COMPANY_ID,
          label: formData.label,
          displayName: formData.displayName || undefined,
          rank: formData.rank,
          track: formData.track || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Career level created");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to create career level");
          },
        }
      );
    }
  };

  const confirmDelete = (level: CareerLevel) => {
    setDeletingLevel(level);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!deletingLevel) return;
    deleteMutation.mutate(
      { companyId: COMPANY_ID, levelId: deletingLevel.id },
      {
        onSuccess: () => {
          toast.success("Career level deleted");
          setShowDeleteConfirm(false);
          setDeletingLevel(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete career level");
        },
      }
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Career Levels</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Define your company's career leveling framework.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load career levels
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              Failed to load career levels. Please try again.
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

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Career Levels</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Define your company's career leveling framework.
            {scheme && (
              <span className="ml-2">
                <Chip variant="filter" selected>{scheme.type}</Chip>
              </span>
            )}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="add" size={18} />
          Add Level
        </Button>
      </AppBar>

      {/* Search */}
      <Search
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search levels..."
      />

      {/* Desktop Table */}
      <Card variant="elevated" className="hidden md:block">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sortedLevels.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="trending_up" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No career levels found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Add your first career level to get started."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Add Level
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLevels.map((level) => (
                  <TableRow key={level.id} className="cursor-pointer" onClick={() => openEdit(level)}>
                    <TableCell className="text-[14px] text-surface-foreground font-mono">
                      {level.rank}
                    </TableCell>
                    <TableCell className="text-[14px] font-medium text-surface-foreground">
                      {level.label}
                    </TableCell>
                    <TableCell className="text-[14px] text-surface-foreground">
                      {level.displayName || "—"}
                    </TableCell>
                    <TableCell>
                      {level.track ? (
                        <Chip variant="filter" selected>
                          {level.track}
                        </Chip>
                      ) : (
                        <span className="text-[14px] text-surface-variant-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Edit">
                          <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => openEdit(level)}>
                            <Icon name="edit" size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content="Delete">
                          <IconButton
                            variant="standard"
                            size="xs"
                            aria-label="Delete"
                            className="text-error"
                            onClick={() => confirmDelete(level)}
                          >
                            <Icon name="delete" size={18} />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="elevated">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </CardContent>
            </Card>
          ))
        ) : sortedLevels.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="trending_up" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No career levels found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Add your first career level."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Add Level
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedLevels.map((level) => (
            <Card key={level.id} variant="elevated" className="cursor-pointer" onClick={() => openEdit(level)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-surface-foreground">
                      {level.label} {level.displayName ? `— ${level.displayName}` : ""}
                    </p>
                    <p className="text-[12px] text-surface-variant-foreground">
                      Rank {level.rank} · {level.track || "No track"}
                    </p>
                  </div>
                  {level.track && (
                    <Chip variant="filter" selected>
                      {level.track}
                    </Chip>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Level Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Edit Career Level" : "Add Career Level"}
            </DialogTitle>
            <DialogDescription>
              {editingLevel
                ? "Update this career level's details."
                : "Define a new career level in your scheme."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              variant="outlined"
              label="Label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., L3, M2, IC4"
            />
            <TextField
              variant="outlined"
              label="Display Name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g., Senior, Staff, Director"
            />
            <TextField
              variant="outlined"
              label="Rank"
              type="number"
              value={String(formData.rank)}
              onChange={(e) => setFormData({ ...formData, rank: Number(e.target.value) })}
              placeholder="Sort order (1, 2, 3...)"
            />
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Track</label>
              <Select
                value={formData.track}
                onValueChange={(value) => setFormData({ ...formData, track: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select track (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IC">IC</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="text" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={handleSubmit}
              disabled={!formData.label || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingLevel
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Career Level</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingLevel?.label}</strong>
              {deletingLevel?.displayName ? ` (${deletingLevel.displayName})` : ""}? This action
              cannot be undone. Positions assigned to this level will be unlinked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="text" onClick={() => setShowDeleteConfirm(false)}>
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
