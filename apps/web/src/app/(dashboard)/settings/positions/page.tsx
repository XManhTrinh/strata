"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
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
        { onSuccess: () => setShowModal(false) }
      );
    } else {
      createMutation.mutate(
        { companyId: COMPANY_ID, ...formData },
        { onSuccess: () => setShowModal(false) }
      );
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ companyId: COMPANY_ID, id });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ companyId: COMPANY_ID, id });
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
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </button>
          {row.archived ? (
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
            >
              Delete
            </button>
          ) : (
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleArchive(row.id);
              }}
            >
              Archive
            </button>
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
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Position
        </button>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {editingPosition ? "Edit Position" : "Create Position"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="pos-name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="pos-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Senior Engineer"
                />
              </div>
              <div>
                <label htmlFor="pos-description" className="block text-sm font-medium text-foreground">
                  Description
                </label>
                <input
                  id="pos-description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Role description"
                />
              </div>
              <div>
                <label htmlFor="pos-level" className="block text-sm font-medium text-foreground">
                  Career Level
                </label>
                <select
                  id="pos-level"
                  value={formData.careerLevel}
                  onChange={(e) => setFormData({ ...formData, careerLevel: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="pos-reports"
                  type="checkbox"
                  checked={formData.canHaveDirectReports}
                  onChange={(e) => setFormData({ ...formData, canHaveDirectReports: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <label htmlFor="pos-reports" className="text-sm text-foreground">
                  Can have direct reports
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingPosition
                    ? "Save Changes"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
