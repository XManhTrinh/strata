"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface OrgUnitType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: "Active" | "Archived";
  unitCount: number;
  [key: string]: unknown;
}

const mockOrgUnitTypes: OrgUnitType[] = [
  { id: "1", name: "Department", description: "Traditional functional department", icon: "🏢", color: "#3B82F6", status: "Active", unitCount: 8 },
  { id: "2", name: "Tribe", description: "Cross-functional product tribe", icon: "⚡", color: "#8B5CF6", status: "Active", unitCount: 4 },
  { id: "3", name: "Squad", description: "Autonomous delivery squad", icon: "🚀", color: "#10B981", status: "Active", unitCount: 12 },
  { id: "4", name: "Chapter", description: "Skill-based community of practice", icon: "📖", color: "#F59E0B", status: "Active", unitCount: 6 },
  { id: "5", name: "Division", description: "Top-level business division", icon: "🏛️", color: "#EF4444", status: "Active", unitCount: 3 },
  { id: "6", name: "Task Force", description: "Temporary project-based group", icon: "🎯", color: "#6B7280", status: "Archived", unitCount: 0 },
];

const columns: Column<OrgUnitType>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-2">
        <span className="text-lg">{row.icon}</span>
        <span className="font-medium">{row.name}</span>
      </div>
    ),
  },
  { key: "description", header: "Description" },
  {
    key: "color",
    header: "Color",
    render: (row) => (
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 rounded-full border border-border"
          style={{ backgroundColor: row.color }}
        />
        <span className="text-xs text-muted-foreground">{row.color}</span>
      </div>
    ),
  },
  {
    key: "unitCount",
    header: "Units",
    sortable: true,
    render: (row) => <span className="text-muted-foreground">{row.unitCount}</span>,
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
          {row.status === "Active" ? "Archive" : "Restore"}
        </button>
      </div>
    ),
  },
];

export default function OrgUnitTypesPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<OrgUnitType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "🏢", color: "#3B82F6" });

  const filteredTypes = mockOrgUnitTypes.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingType(null);
    setFormData({ name: "", description: "", icon: "🏢", color: "#3B82F6" });
    setShowModal(true);
  };

  const openEdit = (type: OrgUnitType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description, icon: type.icon, color: type.color });
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Organization Unit Types</h1>
          <p className="text-xs text-muted-foreground">
            Define the types of organizational units used in your company structure.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Type
        </button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search types..."
        />
      </div>

      <DataTable<OrgUnitType>
        columns={columns}
        data={filteredTypes}
        pageSize={10}
        emptyMessage="No organization unit types found"
        onRowClick={openEdit}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {editingType ? "Edit Type" : "Create Type"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="type-name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="type-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Department"
                />
              </div>
              <div>
                <label htmlFor="type-description" className="block text-sm font-medium text-foreground">
                  Description
                </label>
                <input
                  id="type-description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Brief description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type-icon" className="block text-sm font-medium text-foreground">
                    Icon
                  </label>
                  <input
                    id="type-icon"
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="type-color" className="block text-sm font-medium text-foreground">
                    Color
                  </label>
                  <input
                    id="type-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 h-9 w-full cursor-pointer rounded-md border border-border bg-background"
                  />
                </div>
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
                {editingType ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
