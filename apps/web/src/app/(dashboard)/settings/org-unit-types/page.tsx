"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
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
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

type OrgUnitTypeRow = AdminOrgUnitType & Record<string, unknown>;

export default function OrgUnitTypesPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AdminOrgUnitType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "corporate_fare", color: "#3B82F6" });

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
    setFormData({ name: "", description: "", icon: "corporate_fare", color: "#3B82F6" });
    setShowModal(true);
  };

  const openEdit = (type: OrgUnitTypeRow) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      icon: type.icon || "corporate_fare",
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
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center h-8 w-8 rounded-full"
            style={{ backgroundColor: `${row.color || "#3B82F6"}20` }}
          >
            <span style={{ color: row.color || "#3B82F6" }}>
              <Icon name={row.icon || "corporate_fare"} size={18} />
            </span>
          </div>
          <span className="text-[14px] font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => <span className="text-[14px] text-muted-foreground">{row.description || "—"}</span>,
    },
    {
      key: "color",
      header: "Color",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-full border border-outline-variant"
            style={{ backgroundColor: row.color || "#3B82F6" }}
          />
          <span className="text-[12px] text-muted-foreground">{row.color || "—"}</span>
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
          <Tooltip content={row.archived ? "Restore" : "Archive"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (row.archived) {
                  handleRestore(row.id);
                } else {
                  handleArchive(row.id);
                }
              }}
            >
              <Icon name={row.archived ? "unarchive" : "archive"} size={18} />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Organization Unit Types</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Define the types of organizational units used in your company structure.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              Failed to load org unit types. Please try again.
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
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Organization Unit Types</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Define the types of organizational units used in your company structure.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="add" size={18} />
          Create Type
        </Button>
      </AppBar>

      {/* Search */}
      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search types..."
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
            <DataTable<OrgUnitTypeRow>
              columns={columns}
              data={filteredTypes as OrgUnitTypeRow[]}
              pageSize={10}
              emptyMessage="No organization unit types found"
              onRowClick={openEdit}
            />
          )}
        </CardContent>
      </Card>

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
            <TextField
              variant="outlined"
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Department"
            />
            <TextField
              variant="outlined"
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                variant="outlined"
                label="Icon (Material Symbol)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
              <div className="space-y-1">
                <label className="text-[12px] leading-4 text-surface-variant-foreground">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-14 w-full cursor-pointer rounded-xl border border-outline bg-transparent"
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
    </motion.div>
  );
}
