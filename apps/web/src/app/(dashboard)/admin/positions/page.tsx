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
import { Checkbox } from "@vkieu/mui";
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
import { Select } from "@vkieu/mui";
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
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useArchivePosition,
  useDeletePosition,
  useCareerLevels,
  useCreateCareerLevel,
  type AdminPosition,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function PositionsPage() {
  const companyId = useCompanyId();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<AdminPosition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minLevelId: "",
    maxLevelId: "",
    canHaveDirectReports: false,
  });
  const [levelFormData, setLevelFormData] = useState({
    label: "",
    displayName: "",
    rank: 1,
    track: "",
  });

  const { data: positions = [], isLoading, error, refetch } = usePositions(companyId);
  const { data: careerLevelScheme } = useCareerLevels(companyId);
  const careerLevelsData = careerLevelScheme?.levels ?? [];
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const archiveMutation = useArchivePosition();
  const deleteMutation = useDeletePosition();
  const createLevelMutation = useCreateCareerLevel();

  const filteredPositions = positions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingPosition(null);
    setFormData({ name: "", description: "", minLevelId: "", maxLevelId: "", canHaveDirectReports: false });
    setShowModal(true);
  };

  const openEdit = (position: AdminPosition) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || "",
      minLevelId: position.minLevelId || "",
      maxLevelId: position.maxLevelId || "",
      canHaveDirectReports: position.canHaveDirectReports,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingPosition) {
      updateMutation.mutate(
        { companyId: companyId, id: editingPosition.id, ...formData },
        {
          onSuccess: () => {
            toast.success("Position updated successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update position");
          },
        }
      );
    } else {
      createMutation.mutate(
        { companyId: companyId, ...formData },
        {
          onSuccess: () => {
            toast.success("Position created successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to create position");
          },
        }
      );
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(
      { companyId: companyId, id },
      {
        onSuccess: () => {
          toast.success("Position archived successfully");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to archive position");
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { companyId: companyId, id },
      {
        onSuccess: () => {
          toast.success("Position deleted successfully");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete position");
        },
      }
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Positions</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Configure positions with career levels and reporting capabilities.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load positions
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              Failed to load positions. Please try again.
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
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Positions</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Configure positions with career levels and reporting capabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="tonal" onClick={() => {
            const nextRank = careerLevelsData.length > 0 ? Math.max(...careerLevelsData.map(l => l.rank)) + 1 : 1;
            setLevelFormData({ label: "", displayName: "", rank: nextRank, track: "" });
            setShowLevelModal(true);
          }}>
            <Icon name="trending_up" size={18} />
            Add Level
          </Button>
          <Button onClick={openCreate}>
            <Icon name="add" size={18} />
            Create Position
          </Button>
        </div>
      </AppBar>

      {/* Search */}
      <Search
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search positions..."
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
          ) : filteredPositions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="work" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No positions found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Create your first position to get started."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Create Position
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Level Range</TableHead>
                  <TableHead>Direct Reports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => openEdit(row)}>
                    <TableCell className="text-[14px] font-medium text-surface-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-[14px] text-surface-foreground">
                      {(() => {
                        const minLevel = careerLevelsData.find((l) => l.id === row.minLevelId);
                        const maxLevel = careerLevelsData.find((l) => l.id === row.maxLevelId);
                        if (minLevel && maxLevel) {
                          if (minLevel.id === maxLevel.id) return minLevel.label;
                          return `${minLevel.label} — ${maxLevel.label}`;
                        }
                        if (minLevel) return `${minLevel.label}+`;
                        if (maxLevel) return `≤ ${maxLevel.label}`;
                        return row.careerLevel != null ? `L${row.careerLevel}` : "—";
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Icon
                          name={row.canHaveDirectReports ? "check_circle" : "remove_circle_outline"}
                          size={18}
                          className={row.canHaveDirectReports ? "text-tertiary" : "text-surface-variant-foreground"}
                        />
                        <span className="text-[14px]">{row.canHaveDirectReports ? "Yes" : "No"}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip variant="filter" selected={!row.archived}>
                        {row.archived ? "Archived" : "Active"}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Edit">
                          <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => openEdit(row)}>
                            <Icon name="edit" size={18} />
                          </IconButton>
                        </Tooltip>
                        {row.archived ? (
                          <Tooltip content="Delete permanently">
                            <IconButton
                              variant="standard"
                              size="xs"
                              aria-label="Delete permanently"
                              className="text-error"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Icon name="delete_forever" size={18} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Archive">
                            <IconButton variant="standard" size="xs" aria-label="Archive" onClick={() => handleArchive(row.id)}>
                              <Icon name="archive" size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
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
        ) : filteredPositions.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="work" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No positions found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Create your first position."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Create Position
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPositions.map((row) => (
            <Card key={row.id} variant="elevated" className="cursor-pointer" onClick={() => openEdit(row)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-surface-foreground">{row.name}</p>
                    <p className="text-[12px] text-surface-variant-foreground">
                      {(() => {
                        const minLevel = careerLevelsData.find((l) => l.id === row.minLevelId);
                        const maxLevel = careerLevelsData.find((l) => l.id === row.maxLevelId);
                        if (minLevel && maxLevel) {
                          if (minLevel.id === maxLevel.id) return minLevel.label;
                          return `${minLevel.label} — ${maxLevel.label}`;
                        }
                        if (minLevel) return `${minLevel.label}+`;
                        if (maxLevel) return `≤ ${maxLevel.label}`;
                        return row.careerLevel ? `Level ${row.careerLevel}` : "—";
                      })()}{" "}
                      · {row.canHaveDirectReports ? "Can manage" : "Individual contributor"}
                    </p>
                  </div>
                  <Chip variant="filter" selected={!row.archived}>
                    {row.archived ? "Archived" : "Active"}
                  </Chip>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Position Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent fullScreen>
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? "Edit Position" : "Create Position"}
            </DialogTitle>
            <DialogDescription>
              {editingPosition
                ? "Update position details, career level, and reporting capabilities."
                : "Create a new position with career level and reporting settings."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              variant="outlined"
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Senior Engineer"
            />
            <TextField
              variant="outlined"
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Role description"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                  label="Min Level"
                  value={formData.minLevelId || ""}
                  onValueChange={(value) => {
                    const newMin = value;
                    const minLevel = careerLevelsData.find((l) => l.id === newMin);
                    const maxLevel = careerLevelsData.find((l) => l.id === formData.maxLevelId);
                    const shouldClearMax = minLevel && maxLevel && maxLevel.rank < minLevel.rank;
                    setFormData({ ...formData, minLevelId: newMin, ...(shouldClearMax ? { maxLevelId: "" } : {}) });
                  }}
                  placeholder="Select min level"
                  variant="outlined"
                  options={careerLevelsData
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((level) => ({
                      value: level.id,
                      label: `${level.label} — ${level.displayName || level.label}`,
                    }))}
                />
              <Select
                  label="Max Level"
                  value={formData.maxLevelId || ""}
                  onValueChange={(value) => setFormData({ ...formData, maxLevelId: value })}
                  placeholder="Select max level"
                  variant="outlined"
                  options={careerLevelsData
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .filter((level) => {
                      if (!formData.minLevelId) return true;
                      const minLevel = careerLevelsData.find((l) => l.id === formData.minLevelId);
                      return minLevel ? level.rank >= minLevel.rank : true;
                    })
                    .map((level) => ({
                      value: level.id,
                      label: `${level.label} — ${level.displayName || level.label}`,
                    }))}
                />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pos-reports"
                checked={formData.canHaveDirectReports}
                onCheckedChange={(checked) => setFormData({ ...formData, canHaveDirectReports: checked === true })}
              />
              <label htmlFor="pos-reports" className="text-[14px] leading-5 text-surface-foreground cursor-pointer">
                Can have direct reports
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="text" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingPosition
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Career Level Dialog */}
      <Dialog open={showLevelModal} onOpenChange={setShowLevelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Career Level</DialogTitle>
            <DialogDescription>
              Define a new career level in your company's leveling scheme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                variant="outlined"
                label="Label"
                value={levelFormData.label}
                onChange={(e) => setLevelFormData({ ...levelFormData, label: e.target.value })}
                placeholder="e.g., L3, M2"
              />
              <TextField
                variant="outlined"
                label="Display Name"
                value={levelFormData.displayName}
                onChange={(e) => setLevelFormData({ ...levelFormData, displayName: e.target.value })}
                placeholder="e.g., Senior"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                variant="outlined"
                label="Rank"
                type="number"
                value={String(levelFormData.rank)}
                onChange={(e) => setLevelFormData({ ...levelFormData, rank: Number(e.target.value) })}
                placeholder="Sort order"
              />
              <Select
                  label="Track"
                  value={levelFormData.track}
                  onValueChange={(value) => setLevelFormData({ ...levelFormData, track: value })}
                  placeholder="Track (optional)"
                  variant="outlined"
                  options={[
                    { value: "IC", label: "IC" },
                    { value: "Management", label: "Management" },
                  ]}
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="text" onClick={() => setShowLevelModal(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={() => {
                createLevelMutation.mutate(
                  {
                    companyId: companyId,
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
                    onError: (err) => {
                      toast.error(err.message || "Failed to create career level");
                    },
                  }
                );
              }}
              disabled={!levelFormData.label || createLevelMutation.isPending}
            >
              {createLevelMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
