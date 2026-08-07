"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <span className="inline-flex items-center gap-1">
          <span className="text-sm font-medium text-foreground">
            {row.careerLevel != null ? `L${row.careerLevel}` : "—"}
          </span>
        </span>
      ),
    },
    {
      key: "canHaveDirectReports",
      header: "Can Have Direct Reports",
      render: (row) => (
        <span className={`text-sm ${row.canHaveDirectReports ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          {row.canHaveDirectReports ? "✓ Yes" : "— No"}
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </Button>
          {row.archived ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
            >
              Delete
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(row.id);
              }}
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Positions</h1>
            <p className="text-xs text-muted-foreground">
              Configure positions with career levels and reporting capabilities.
            </p>
          </div>
        </AppBar>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load positions. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Positions</h1>
          <p className="text-xs text-muted-foreground">
            Configure positions with career levels and reporting capabilities.
          </p>
        </div>
        <Button onClick={openCreate}>
          Create Position
        </Button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search positions..."
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading...</span>
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
            <div className="space-y-2">
              <Label htmlFor="pos-name">Name</Label>
              <Input
                id="pos-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Senior Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-description">Description</Label>
              <Input
                id="pos-description"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Role description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-level">Career Level</Label>
              <Select
                value={String(formData.careerLevel)}
                onValueChange={(value) => setFormData({ ...formData, careerLevel: Number(value) })}
              >
                <SelectTrigger id="pos-level">
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
              <input
                id="pos-reports"
                type="checkbox"
                checked={formData.canHaveDirectReports}
                onChange={(e) => setFormData({ ...formData, canHaveDirectReports: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              />
              <Label htmlFor="pos-reports">Can have direct reports</Label>
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
    </div>
  );
}
