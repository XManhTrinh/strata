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
  useOrgUnitTypes,
  useCreateOrgUnitType,
  useUpdateOrgUnitType,
  useArchiveOrgUnitType,
  useRestoreOrgUnitType,
  type AdminOrgUnitType,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";

export default function OrgUnitTypesPage() {
  const companyId = useCompanyId();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AdminOrgUnitType | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "corporate_fare", color: "#3B82F6" });

  const { data: orgUnitTypes = [], isLoading, error, refetch } = useOrgUnitTypes(companyId);
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

  const openEdit = (type: AdminOrgUnitType) => {
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
        { companyId: companyId, id: editingType.id, ...formData },
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
        { companyId: companyId, ...formData },
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
      { companyId: companyId, id },
      {
        onSuccess: () => toast.success("Type archived"),
        onError: (err) => toast.error(err.message || "Failed to archive type"),
      }
    );
  };

  const handleRestore = (id: string) => {
    restoreMutation.mutate(
      { companyId: companyId, id },
      {
        onSuccess: () => toast.success("Type restored"),
        onError: (err) => toast.error(err.message || "Failed to restore type"),
      }
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Organization Unit Types</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Define the types of organizational units used in your company structure.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load types
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              Failed to load org unit types. Please try again.
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
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Organization Unit Types</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Define the types of organizational units used in your company structure.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="add" size={18} />
          Create Type
        </Button>
      </AppBar>

      {/* Search */}
      <Search
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search types..."
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
          ) : filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="label" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No types found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Create your first organization unit type."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Create Type
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => openEdit(row)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center h-8 w-8 rounded-full"
                          style={{ backgroundColor: `${row.color || "#3B82F6"}20` }}
                        >
                          <span style={{ color: row.color || "#3B82F6" }}>
                            <Icon name={row.icon || "corporate_fare"} size={18} />
                          </span>
                        </div>
                        <span className="text-[14px] font-medium text-surface-foreground">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[14px] text-surface-variant-foreground">
                      {row.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-outline-variant"
                          style={{ backgroundColor: row.color || "#3B82F6" }}
                        />
                        <span className="text-[12px] text-surface-variant-foreground">{row.color || "—"}</span>
                      </div>
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
                        <Tooltip content={row.archived ? "Restore" : "Archive"}>
                          <IconButton
                            variant="standard"
                            size="xs"
                            aria-label={row.archived ? "Restore" : "Archive"}
                            onClick={() => {
                              if (row.archived) {
                                handleRestore(row.id);
                              } else {
                                handleArchive(row.id);
                              }
                            }}
                          >
                            <Icon name={row.archived ? "unarchive" : "archive"} size={18} />
                          </IconButton>
                        </Tooltip>
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
        ) : filteredTypes.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="label" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No types found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                {search ? "Try adjusting your search." : "Create your first organization unit type."}
              </p>
              {!search && (
                <Button onClick={openCreate}>
                  <Icon name="add" size={18} />
                  Create Type
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTypes.map((row) => (
            <Card key={row.id} variant="elevated" className="cursor-pointer" onClick={() => openEdit(row)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center h-10 w-10 rounded-full"
                      style={{ backgroundColor: `${row.color || "#3B82F6"}20` }}
                    >
                      <span style={{ color: row.color || "#3B82F6" }}>
                        <Icon name={row.icon || "corporate_fare"} size={20} />
                      </span>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-surface-foreground">{row.name}</p>
                      <p className="text-[12px] text-surface-variant-foreground">{row.description || "No description"}</p>
                    </div>
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

      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
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
              <IconPicker
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                color={formData.color}
              />
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
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
