"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogTitle,
  AnimatedDialogDescription,
  AnimatedDialogFooter,
} from "@/components/ui/animated-dialog";
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

type PositionRow = AdminPosition & Record<string, unknown>;

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

  const { data: positions = [], isLoading, error } = usePositions(COMPANY_ID);
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

  const openEdit = (position: PositionRow) => {
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

  const columns: Column<PositionRow>[] = [
    { key: "name", header: "Name", sortable: true },
    {
      key: "careerLevel",
      header: "Career Level",
      sortable: true,
      render: (row) => (
        <span className="text-[14px] font-medium text-foreground">
          {row.careerLevel != null ? `L${row.careerLevel}` : "—"}
        </span>
      ),
    },
    {
      key: "canHaveDirectReports",
      header: "Direct Reports",
      render: (row) => (
        <span className="flex items-center gap-1">
          <Icon
            name={row.canHaveDirectReports ? "check_circle" : "remove_circle_outline"}
            size={18}
            className={row.canHaveDirectReports ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}
          />
          <span className="text-[14px]">{row.canHaveDirectReports ? "Yes" : "No"}</span>
        </span>
      ),
    },
    {
      key: "archived",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={!row.archived ? "success" : "default"}>
          {row.archived ? "Archived" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip content="Edit">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
            >
              <Icon name="edit" size={18} />
            </Button>
          </Tooltip>
          {row.archived ? (
            <Tooltip content="Delete permanently">
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id);
                }}
              >
                <Icon name="delete_forever" size={18} />
              </Button>
            </Tooltip>
          ) : (
            <Tooltip content="Archive">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(row.id);
                }}
              >
                <Icon name="archive" size={18} />
              </Button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Positions</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Configure positions with career levels and reporting capabilities.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              Failed to load positions. Please try again.
            </p>
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
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Positions</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Configure positions with career levels and reporting capabilities.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="add" size={18} />
          Create Position
        </Button>
      </AppBar>

      {/* Search */}
      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search positions..."
      />

      {/* DataTable */}
      <Card variant="outlined">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <DataTable<PositionRow>
              columns={columns}
              data={filteredPositions as PositionRow[]}
              pageSize={10}
              emptyMessage="No positions found"
              onRowClick={openEdit}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Position Dialog */}
      <AnimatedDialog open={showModal} onOpenChange={setShowModal}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>
              {editingPosition ? "Edit Position" : "Create Position"}
            </AnimatedDialogTitle>
            <AnimatedDialogDescription>
              {editingPosition
                ? "Update position details, career level, and reporting capabilities."
                : "Create a new position with career level and reporting settings."}
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
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
                onChange={(e) => setFormData({ ...formData, canHaveDirectReports: (e.target as HTMLInputElement).checked })}
              />
              <label htmlFor="pos-reports" className="text-[14px] leading-5 text-foreground cursor-pointer">
                Can have direct reports
              </label>
            </div>
          </div>
          <AnimatedDialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingPosition
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </AnimatedDialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </motion.div>
  );
}
