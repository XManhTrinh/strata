"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface Position {
  id: string;
  name: string;
  description: string;
  careerLevel: number;
  canHaveDirectReports: boolean;
  status: "Active" | "Archived";
  assignedCount: number;
  [key: string]: unknown;
}

const mockPositions: Position[] = [
  { id: "1", name: "Junior Engineer", description: "Entry-level software engineering role", careerLevel: 1, canHaveDirectReports: false, status: "Active", assignedCount: 12 },
  { id: "2", name: "Software Engineer", description: "Mid-level individual contributor", careerLevel: 2, canHaveDirectReports: false, status: "Active", assignedCount: 24 },
  { id: "3", name: "Senior Engineer", description: "Senior individual contributor with mentoring responsibilities", careerLevel: 3, canHaveDirectReports: false, status: "Active", assignedCount: 18 },
  { id: "4", name: "Staff Engineer", description: "Technical leadership across teams", careerLevel: 4, canHaveDirectReports: false, status: "Active", assignedCount: 6 },
  { id: "5", name: "Engineering Manager", description: "People manager for engineering teams", careerLevel: 3, canHaveDirectReports: true, status: "Active", assignedCount: 8 },
  { id: "6", name: "Senior Engineering Manager", description: "Manages multiple engineering teams", careerLevel: 4, canHaveDirectReports: true, status: "Active", assignedCount: 4 },
  { id: "7", name: "Director of Engineering", description: "Department-level engineering leadership", careerLevel: 5, canHaveDirectReports: true, status: "Active", assignedCount: 2 },
  { id: "8", name: "VP of Engineering", description: "Executive engineering leadership", careerLevel: 6, canHaveDirectReports: true, status: "Active", assignedCount: 1 },
  { id: "9", name: "Product Manager", description: "Product strategy and roadmap ownership", careerLevel: 3, canHaveDirectReports: false, status: "Active", assignedCount: 5 },
  { id: "10", name: "Technical Lead", description: "Deprecated in favor of Staff Engineer", careerLevel: 4, canHaveDirectReports: true, status: "Archived", assignedCount: 0 },
];

const columns: Column<Position>[] = [
  { key: "name", header: "Name", sortable: true },
  {
    key: "careerLevel",
    header: "Career Level",
    sortable: true,
    render: (row) => (
      <span className="inline-flex items-center gap-1">
        <span className="text-sm font-medium text-foreground">L{row.careerLevel}</span>
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
    key: "assignedCount",
    header: "Assigned",
    sortable: true,
    render: (row) => <span className="text-muted-foreground">{row.assignedCount}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <Badge variant={row.status === "Active" ? "success" : "default"}>
        {row.status}
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
          onClick={(e) => e.stopPropagation()}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {row.status === "Active" ? "Archive" : "Delete"}
        </button>
      </div>
    ),
  },
];

export default function PositionsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    careerLevel: 1,
    canHaveDirectReports: false,
  });

  const filteredPositions = mockPositions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingPosition(null);
    setFormData({ name: "", description: "", careerLevel: 1, canHaveDirectReports: false });
    setShowModal(true);
  };

  const openEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      description: position.description,
      careerLevel: position.careerLevel,
      canHaveDirectReports: position.canHaveDirectReports,
    });
    setShowModal(true);
  };

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

      <DataTable<Position>
        columns={columns}
        data={filteredPositions}
        pageSize={10}
        emptyMessage="No positions found"
        onRowClick={openEdit}
      />

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
                onClick={() => setShowModal(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {editingPosition ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
