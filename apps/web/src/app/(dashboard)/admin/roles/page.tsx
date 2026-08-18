"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Checkbox } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { List, ListItem } from "@vkieu/mui";
import { Select } from "@vkieu/mui";
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
  useRoles,
  useCreateRole,
  useRolePermissions,
  useAddRolePermission,
  useRemoveRolePermission,
  useAllFeatures,
  COMPANY_ID,
  type AdminRole,
  type AdminFeature,
  type RolePermissionDetail,
} from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

type Scope = "OWN" | "DIRECT_REPORTS" | "ORGANIZATION_UNIT" | "BRANCH" | "COMPANY" | "GLOBAL";

const scopeOptions: Scope[] = ["OWN", "DIRECT_REPORTS", "ORGANIZATION_UNIT", "BRANCH", "COMPANY", "GLOBAL"];

const scopeLabels: Record<Scope, string> = {
  OWN: "Own",
  DIRECT_REPORTS: "Direct Reports",
  ORGANIZATION_UNIT: "Org Unit",
  BRANCH: "Branch",
  COMPANY: "Company",
  GLOBAL: "Global",
};

export default function RolesPage() {
  const { data: backendRoles, isLoading, error } = useRoles(COMPANY_ID);
  const { data: allFeatures, isLoading: featuresLoading } = useAllFeatures();
  const createRoleMutation = useCreateRole();
  const addPermissionMutation = useAddRolePermission();
  const removePermissionMutation = useRemoveRolePermission();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [mobileShowPermissions, setMobileShowPermissions] = useState(false);

  const roles: AdminRole[] = backendRoles ?? [];
  const effectiveSelectedId = selectedRoleId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((r) => r.id === effectiveSelectedId) ?? roles[0];

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(roleSearch.toLowerCase())
  );

  const {
    data: rolePermissionDetail,
    isLoading: permissionsLoading,
  } = useRolePermissions(COMPANY_ID, effectiveSelectedId ?? "");

  const toggleFeatureExpanded = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const featureCatalog: AdminFeature[] = allFeatures ?? [];
    setExpandedFeatures(new Set(featureCatalog.map((f) => f.id)));
  };

  const collapseAll = () => {
    setExpandedFeatures(new Set());
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate(
      { companyId: COMPANY_ID, name: newRoleName.trim(), description: newRoleDescription.trim() || undefined },
      {
        onSuccess: (newRole) => {
          toast.success("Role created successfully");
          setSelectedRoleId(newRole.id);
          setNewRoleName("");
          setNewRoleDescription("");
          setShowCreateModal(false);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create role");
        },
      }
    );
  };

  const handleDuplicateRole = () => {
    if (!selectedRole) return;
    const duplicateName = `${selectedRole.name} (Copy)`;
    createRoleMutation.mutate(
      { companyId: COMPANY_ID, name: duplicateName, description: selectedRole.description || undefined },
      {
        onSuccess: (newRole) => {
          toast.success("Role duplicated successfully");
          setSelectedRoleId(newRole.id);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to duplicate role");
        },
      }
    );
  };

  const handleTogglePermission = useCallback(
    (featurePermissionId: string, checked: boolean, existingPermId?: string) => {
      if (!effectiveSelectedId) return;
      if (checked) {
        addPermissionMutation.mutate(
          {
            companyId: COMPANY_ID,
            roleId: effectiveSelectedId,
            featurePermissionId,
            scope: "OWN",
          },
          {
            onSuccess: () => {
              toast.success("Permission added");
            },
            onError: (err) => {
              toast.error(err.message || "Failed to add permission");
            },
          }
        );
      } else if (existingPermId) {
        removePermissionMutation.mutate(
          {
            companyId: COMPANY_ID,
            roleId: effectiveSelectedId,
            permId: existingPermId,
          },
          {
            onSuccess: () => {
              toast.success("Permission removed");
            },
            onError: (err) => {
              toast.error(err.message || "Failed to remove permission");
            },
          }
        );
      }
    },
    [effectiveSelectedId, addPermissionMutation, removePermissionMutation]
  );

  const handleScopeChange = useCallback(
    (featurePermissionId: string, newScope: Scope, existingPermId?: string) => {
      if (!effectiveSelectedId) return;
      if (existingPermId) {
        removePermissionMutation.mutate(
          {
            companyId: COMPANY_ID,
            roleId: effectiveSelectedId,
            permId: existingPermId,
          },
          {
            onSuccess: () => {
              addPermissionMutation.mutate(
                {
                  companyId: COMPANY_ID,
                  roleId: effectiveSelectedId,
                  featurePermissionId,
                  scope: newScope,
                },
                {
                  onSuccess: () => {
                    toast.success("Scope updated");
                  },
                  onError: (err) => {
                    toast.error(err.message || "Failed to update scope");
                  },
                }
              );
            },
            onError: (err) => {
              toast.error(err.message || "Failed to update scope");
            },
          }
        );
      }
    },
    [effectiveSelectedId, addPermissionMutation, removePermissionMutation]
  );

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <motion.div
        className="flex flex-col h-full"
        variants={pageTransitionVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={defaultTransition}
      >
        <PageHeader onCreateClick={() => {}} />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0 mt-6 min-h-0">
          {/* Skeleton: Role List */}
          <div className="border-r border-outline-variant p-4 space-y-3">
            <Skeleton className="h-14 w-full rounded-full" />
            <div className="space-y-2 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-18 w-full rounded-lg" />
              ))}
            </div>
          </div>
          {/* Skeleton: Permission Matrix */}
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div
        className="flex flex-col h-full"
        variants={pageTransitionVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={defaultTransition}
      >
        <PageHeader onCreateClick={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <Card variant="outlined" className="max-w-sm w-full">
            <CardContent className="flex flex-col items-center py-12 px-8 text-center">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
                <Icon name="error" size={24} className="text-destructive" />
              </div>
              <p className="text-[16px] leading-6 font-medium text-foreground mb-1">
                Unable to load roles
              </p>
              <p className="text-[14px] leading-5 text-muted-foreground">
                Something went wrong. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // ─── Empty State (No Roles) ───────────────────────────────────────────────────
  if (roles.length === 0) {
    return (
      <motion.div
        className="flex flex-col h-full"
        variants={pageTransitionVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={defaultTransition}
      >
        <PageHeader onCreateClick={() => setShowCreateModal(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
              <Icon name="shield" size={40} className="text-primary" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-foreground mb-2">
              No roles yet
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">
              Create your first role to start managing permissions and access control for your team.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Icon name="add" size={18} />
              Create your first role
            </Button>
          </div>
        </div>
        <CreateRoleDialog
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          name={newRoleName}
          onNameChange={setNewRoleName}
          description={newRoleDescription}
          onDescriptionChange={setNewRoleDescription}
          onSubmit={handleCreateRole}
          isPending={createRoleMutation.isPending}
        />
      </motion.div>
    );
  }

  const featureCatalog: AdminFeature[] = allFeatures ?? [];

  return (
    <motion.div
      className="flex flex-col h-full"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Page Header */}
      <PageHeader onCreateClick={() => setShowCreateModal(true)} />

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] mt-6 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
        {/* Left Panel: Role Sidebar */}
        <div className="border-b lg:border-b-0 lg:border-r border-outline-variant flex flex-col min-h-0">
          {/* Search */}
          <div className="p-3 shrink-0">
            <Search
              value={roleSearch}
              onValueChange={setRoleSearch}
              placeholder="Search roles..."
              className="min-w-0 w-full max-w-none mx-0"
            />
          </div>
          <Divider />

          {/* Role List */}
          <div className="flex-1 overflow-y-auto">
            <List className="py-0">
              {filteredRoles.map((role) => {
                const isSelected = role.id === effectiveSelectedId;
                return (
                  <ListItem
                    key={role.id}
                    interactive
                    selected={isSelected}
                    lines={2}
                    leading={
                      <Icon
                        name={isSelected ? "shield" : "shield"}
                        size={24}
                        className={isSelected ? "text-primary" : "text-surface-variant-foreground"}
                      />
                    }
                    trailing={
                      role.isSystem ? (
                        <Chip variant="filter" selected className="text-[11px] h-6 px-2">
                          System
                        </Chip>
                      ) : undefined
                    }
                    supporting={role.description ?? undefined}
                    onClick={() => {
                      setSelectedRoleId(role.id);
                      setMobileShowPermissions(true);
                    }}
                  >
                    {role.name}
                  </ListItem>
                );
              })}
            </List>
            {filteredRoles.length === 0 && roleSearch && (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Icon name="search_off" size={24} className="text-muted-foreground/40 mb-2" />
                <p className="text-[14px] leading-5 text-muted-foreground">
                  No roles matching &ldquo;{roleSearch}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Permission Matrix */}
        <div className={`flex flex-col min-h-0 ${!mobileShowPermissions ? "hidden lg:flex" : "flex"}`}>
          {selectedRole ? (
            <>
              {/* Role Detail Header */}
              <div className="shrink-0 px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {/* Back button for mobile */}
                      <button
                        type="button"
                        onClick={() => setMobileShowPermissions(false)}
                        className="lg:hidden flex items-center justify-center h-10 w-10 -ml-2 rounded-full hover:bg-surface-foreground/8 transition-colors"
                        aria-label="Back to roles"
                      >
                        <Icon name="arrow_back" size={20} />
                      </button>
                      <h2 className="text-[22px] leading-7 font-normal text-foreground truncate">
                        {selectedRole.name}
                      </h2>
                      {selectedRole.isSystem && (
                        <Chip variant="filter" selected className="shrink-0">
                          System
                        </Chip>
                      )}
                    </div>
                    {selectedRole.description && (
                      <p className="text-[14px] leading-5 text-muted-foreground lg:pl-0 pl-10">
                        {selectedRole.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip content="Duplicate this role" side="bottom">
                      <Button
                        variant="tonal"
                        onClick={handleDuplicateRole}
                        disabled={createRoleMutation.isPending}
                      >
                        <Icon name="content_copy" size={18} />
                        Duplicate
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Permission Matrix Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {(permissionsLoading || featuresLoading) ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <PermissionMatrix
                    features={featureCatalog}
                    rolePermissions={rolePermissionDetail}
                    onToggle={handleTogglePermission}
                    onScopeChange={handleScopeChange}
                    isMutating={addPermissionMutation.isPending || removePermissionMutation.isPending}
                    expandedFeatures={expandedFeatures}
                    onToggleFeature={toggleFeatureExpanded}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-center px-4">
                <Icon name="shield" size={48} className="text-muted-foreground/30 mb-3" />
                <p className="text-[14px] leading-5 text-muted-foreground">
                  Select a role to view permissions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        name={newRoleName}
        onNameChange={setNewRoleName}
        description={newRoleDescription}
        onDescriptionChange={setNewRoleDescription}
        onSubmit={handleCreateRole}
        isPending={createRoleMutation.isPending}
      />
    </motion.div>
  );
}

// ─── Page Header ────────────────────────────────────────────────────────────────

function PageHeader({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 shrink-0">
      <div>
        <h1 className="text-[24px] leading-8 font-normal text-foreground">
          Roles & Permissions
        </h1>
        <p className="text-[14px] leading-5 text-muted-foreground mt-1">
          Define roles and manage feature-level access with granular scope control.
        </p>
      </div>
      <Button onClick={onCreateClick} className="shrink-0">
        <Icon name="add" size={18} />
        Create Role
      </Button>
    </div>
  );
}

// ─── Create Role Dialog ─────────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

function CreateRoleDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSubmit,
  isPending,
}: CreateRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent icon="shield">
        <DialogHeader centered>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Create a new role to assign feature permissions and scope access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Role Name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Finance Administrator"
            onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
          />
          <TextField
            variant="outlined"
            label="Description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description of responsibilities"
          />
        </div>
        <DialogFooter>
          <Button
            variant="text"
            onClick={() => {
              onOpenChange(false);
              onNameChange("");
              onDescriptionChange("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="text"
            onClick={onSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permission Matrix Component ────────────────────────────────────────────────

interface PermissionMatrixProps {
  features: AdminFeature[];
  rolePermissions: RolePermissionDetail | undefined;
  onToggle: (featurePermissionId: string, checked: boolean, existingPermId?: string) => void;
  onScopeChange: (featurePermissionId: string, newScope: Scope, existingPermId?: string) => void;
  isMutating: boolean;
  expandedFeatures: Set<string>;
  onToggleFeature: (featureId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

function PermissionMatrix({
  features,
  rolePermissions,
  onToggle,
  onScopeChange,
  isMutating,
  expandedFeatures,
  onToggleFeature,
  onExpandAll,
  onCollapseAll,
}: PermissionMatrixProps) {
  if (!features.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/50 mb-4">
          <Icon name="lock" size={24} className="text-muted-foreground/60" />
        </div>
        <p className="text-[16px] leading-6 font-medium text-foreground mb-1">
          No features available
        </p>
        <p className="text-[14px] leading-5 text-muted-foreground">
          Features will appear here once configured.
        </p>
      </div>
    );
  }

  const allExpanded = expandedFeatures.size === features.length;

  return (
    <div className="space-y-4">
      {/* Expand/Collapse controls */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] leading-4 font-medium text-muted-foreground uppercase tracking-wide">
          {features.length} {features.length === 1 ? "feature" : "features"}
        </p>
        <Button
          variant="text"
          onClick={allExpanded ? onCollapseAll : onExpandAll}
          className="text-[12px] h-8"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {/* Feature Groups */}
      {features.map((feature) => {
        const isExpanded = expandedFeatures.has(feature.id);
        const assignedCount = feature.permissions.filter((fp) =>
          rolePermissions?.permissions.some((rp) => rp.featurePermissionId === fp.id)
        ).length;

        return (
          <Card key={feature.id} variant="outlined" className="overflow-hidden">
            {/* Feature Header (Collapsible) */}
            <button
              type="button"
              onClick={() => onToggleFeature(feature.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-foreground/4 transition-colors text-left"
            >
              <Icon
                name="extension"
                size={20}
                className="text-primary shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[14px] leading-5 font-medium text-foreground">
                  {feature.displayName}
                </span>
              </div>
              {assignedCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-secondary-container text-secondary-container-foreground text-[11px] font-medium">
                  {assignedCount}/{feature.permissions.length}
                </span>
              )}
              <Icon
                name={isExpanded ? "expand_less" : "expand_more"}
                size={20}
                className="text-muted-foreground shrink-0"
              />
            </button>

            {/* Permission Rows */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <Divider />
                  <div className="divide-y divide-outline-variant">
                    {feature.permissions.map((fp) => {
                      const assigned = rolePermissions?.permissions.find(
                        (rp) => rp.featurePermissionId === fp.id
                      );
                      const isEnabled = !!assigned;
                      const currentScope = (assigned?.scope as Scope) ?? "OWN";

                      return (
                        <div
                          key={fp.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-foreground/4 transition-colors"
                        >
                          <Checkbox
                            checked={isEnabled}
                            disabled={isMutating}
                            onCheckedChange={(checked) => {
                              onToggle(fp.id, checked === true, assigned?.id);
                            }}
                          />
                          <span
                            className={`flex-1 text-[14px] leading-5 min-w-0 truncate ${
                              isEnabled ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {fp.displayName}
                          </span>
                          <Select
                            value={currentScope}
                            disabled={!isEnabled || isMutating}
                            onValueChange={(value) => {
                              onScopeChange(fp.id, value as Scope, assigned?.id);
                            }}
                            className={`h-8 w-35 text-[12px] border-outline-variant ${
                              !isEnabled ? "opacity-40" : ""
                            }`}
                            variant="outlined"
                            options={scopeOptions.map((s) => ({
                              value: s,
                              label: scopeLabels[s],
                            }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}
