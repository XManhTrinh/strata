"use client";

import { useState } from "react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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
        {
          onSuccess: () => {
            toast.success("Type updated successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update type");
          },
        }
      );
    } else {
      createMutation.mutate(
        { companyId: COMPANY_ID, ...formData },
        {
          onSuccess: () => {
            toast.success("Type created successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to create type");
          },
        }
      );
    }
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(
      { companyId: COMPANY_ID, id },
      {
        onSuccess: () => toast.success("Type archived"),
        onError: (err) => toast.error(err.message || "Failed to archive type"),
      }
    );
  };

  const handleRestore = (id: string) => {
    restoreMutation.mutate(
      { companyId: COMPANY_ID, id },
      {
        onSuccess: () => toast.success("Type restored"),
        onError: (err) => toast.error(err.message || "Failed to restore type"),
      }
    );
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
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
          </Button>
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
        <Button onClick={openCreate}>
          Create Type
        </Button>
      </AppBar>

      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search types..."
      />

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

      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Type" : "Create Type"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Update the organization unit type details."
                : "Define a new type for your organization structure."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-description">Description</Label>
              <Input
                id="type-description"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type-icon">Icon</Label>
                <Input
                  id="type-icon"
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-color">Color</Label>
                <input
                  id="type-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded-xl border border-input bg-background"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingType
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
