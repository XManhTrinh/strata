"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import {
  useOrgUnitTypes,
  useCreateOrgUnitType,
  useUpdateOrgUnitType,
  useArchiveOrgUnitType,
  useRestoreOrgUnitType,
  COMPANY_ID,
  type AdminOrgUnitType,
} from "@/services";

type OrgUnitTypeRow = AdminOrgUnitType & Record<string, unknown>;

export default function OrgUnitTypesPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AdminOrgUnitType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "🏢", color: "#3B82F6" });

  const { data: orgUnitTypes = [], isLoading, error } = useOrgUnitTypes(COMPANY_ID);
  const createMutation = useCreateOrgUnitType();
  const updateMutation = useUpdateOrgUnitType();
  const archiveMutation = useArchiveOrgUnitType();
  const restoreMutation = useRestoreOrgUnitType();

  const filteredTypes = orgUnitTypes.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingType(null);
    setFormData({ name: "", description: "", icon: "🏢", color: "#3B82F6" });
    setShowModal(true);
  };

  const openEdit = (type: OrgUnitTypeRow) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      icon: type.icon || "🏢",
      color: type.color || "#3B82F6",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingType) {
      updateMutation.mutate(
        { companyId: COMPANY_ID, id: editingType.id, ...formData },
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

  const handleRestore = (id: string) => {
    restoreMutation.mutate({ companyId: COMPANY_ID, id });
  };

  const columns: Column<OrgUnitTypeRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{row.icon || "🏢"}</span>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "description", header: "Description", render: (row) => <span>{row.description || "—"}</span> },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: row.color || "#3B82F6" }}
          />
          <span className="text-xs text-muted-foreground">{row.color || "—"}</span>
        </div>
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
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              if (row.archived) {
                handleRestore(row.id);
              } else {
                handleArchive(row.id);
              }
            }}
          >
            {row.archived ? "Restore" : "Archive"}
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Organization Unit Types</h1>
            <p className="text-xs text-muted-foreground">
              Define the types of organizational units used in your company structure.
            </p>
          </div>
        </AppBar>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load org unit types. Please try again.
        </div>
      </div>
    );
  }

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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <DataTable<OrgUnitTypeRow>
          columns={columns}
          data={filteredTypes as OrgUnitTypeRow[]}
          pageSize={10}
          emptyMessage="No organization unit types found"
          onRowClick={openEdit}
        />
      )}

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
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingType
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
