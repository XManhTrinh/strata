"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "@strata/mui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@strata/mui/buttons";
import { IconButton } from "@strata/mui/buttons";
import { Icon } from "@strata/mui";
import { Card, CardContent } from "@strata/mui";
import { Chip } from "@strata/mui";
import { Checkbox } from "@strata/mui";
import { TextField } from "@strata/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@strata/mui";
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
} from "@strata/mui";
import { toast } from "sonner";
import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useArchivePosition,
  useDeletePosition,
  COMPANY_ID,
  type AdminPosition,
} from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function PositionsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<AdminPosition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    careerLevel: 1,
    canHaveDirectReports: false,
  });

  const { data: positions = [], isLoading, error, refetch } = usePositions(COMPANY_ID);
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const archiveMutation = useArchivePosition();
  const deleteMutation = useDeletePosition();

  const filteredPositions = positions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingPosition(null);
    setFormData({ name: "", description: "", careerLevel: 1, canHaveDirectReports: false });
    setShowModal(true);
  };

  const openEdit = (position: AdminPosition) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description || "",
      careerLevel: position.careerLevel || 1,
      canHaveDirectReports: position.canHaveDirectReports,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingPosition) {
      updateMutation.mutate(
        { companyId: COMPANY_ID, id: editingPosition.id, ...formData },
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
        { companyId: COMPANY_ID, ...formData },
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
      { companyId: COMPANY_ID, id },
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
      { companyId: COMPANY_ID, id },
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
        <Button onClick={openCreate}>
          <Icon name="add" size={18} />
          Create Position
        </Button>
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
                  <TableHead>Career Level</TableHead>
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
                      {row.careerLevel != null ? `L${row.careerLevel}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Icon
                          name={row.canHaveDirectReports ? "check_circle" : "remove_circle_outline"}
                          size={18}
                          className={row.canHaveDirectReports ? "text-green-600 dark:text-green-400" : "text-surface-variant-foreground"}
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
                      Level {row.careerLevel || "—"} · {row.canHaveDirectReports ? "Can manage" : "Individual contributor"}
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
        <DialogContent>
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
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Career Level</label>
              <Select
                value={String(formData.careerLevel)}
                onValueChange={(value) => setFormData({ ...formData, careerLevel: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      Level {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </motion.div>
  );
}
