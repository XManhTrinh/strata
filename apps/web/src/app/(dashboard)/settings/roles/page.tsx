"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Badge } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@/components/ui/divider";
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

const scopeColors: Record<Scope, string> = {
  OWN: "text-blue-600 dark:text-blue-400",
  DIRECT_REPORTS: "text-purple-600 dark:text-purple-400",
  ORGANIZATION_UNIT: "text-amber-600 dark:text-amber-400",
  BRANCH: "text-green-600 dark:text-green-400",
  COMPANY: "text-red-600 dark:text-red-400",
  GLOBAL: "text-pink-600 dark:text-pink-400",
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Roles & Permissions</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Manage roles and assign feature-level permissions with scope control.
            </p>
          </div>
        </AppBar>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <Card variant="outlined">
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Roles & Permissions</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Manage roles and assign feature-level permissions with scope control.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              Failed to load roles. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const featureCatalog: AdminFeature[] = allFeatures ?? [];

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
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Roles & Permissions</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Manage roles and assign feature-level permissions with scope control.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDuplicateRole}
            disabled={createRoleMutation.isPending}
          >
            <Icon name="content_copy" size={18} />
            Duplicate Role
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Icon name="add" size={18} />
            Create Role
          </Button>
        </div>
      </AppBar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Panel: Role List */}
        <Card variant="outlined" className="overflow-hidden">
          <div className="p-3 border-b border-outline-variant">
            <SearchBar
              value={roleSearch}
              onValueChange={setRoleSearch}
              placeholder="Search roles..."
            />
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {filteredRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full border-b border-outline-variant px-4 py-3 text-left transition-colors hover:bg-surface-foreground/8 ${
                  role.id === effectiveSelectedId ? "bg-primary/8" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name="shield" size={18} className={role.id === effectiveSelectedId ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-[14px] leading-5 font-medium text-foreground">{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="info">System</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground line-clamp-1 pl-[26px]">
                  {role.description}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* Right Panel: Permission Matrix */}
        {selectedRole && (
          <Card variant="outlined" className="overflow-hidden">
            <div className="border-b border-outline-variant px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] leading-6 font-medium text-foreground">{selectedRole.name}</h2>
                  <p className="text-[12px] leading-4 text-muted-foreground">{selectedRole.description}</p>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-4">
              {(permissionsLoading || featuresLoading) ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-32 w-full rounded-lg" />
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
                />
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Role Modal */}
      <AnimatedDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>Create Role</AnimatedDialogTitle>
            <AnimatedDialogDescription>
              Create a new role. You can assign permissions after creation.
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <div className="space-y-4">
            <TextField
              variant="outlined"
              label="Name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Finance Administrator"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateRole(); }}
            />
            <TextField
              variant="outlined"
              label="Description"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder="Brief description of this role's responsibilities"
            />
          </div>
          <AnimatedDialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreateModal(false); setNewRoleName(""); setNewRoleDescription(""); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </AnimatedDialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </motion.div>
  );
}

// ─── Permission Matrix Component ──────────────────────────────────────────────

interface PermissionMatrixProps {
  features: AdminFeature[];
  rolePermissions: RolePermissionDetail | undefined;
  onToggle: (featurePermissionId: string, checked: boolean, existingPermId?: string) => void;
  onScopeChange: (featurePermissionId: string, newScope: Scope, existingPermId?: string) => void;
  isMutating: boolean;
}

function PermissionMatrix({ features, rolePermissions, onToggle, onScopeChange, isMutating }: PermissionMatrixProps) {
  if (!features.length) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Icon name="lock" size={40} className="text-muted-foreground/40 mb-2" />
        <p className="text-[14px] leading-5 text-muted-foreground">No features available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {features.map((feature) => (
        <div key={feature.id}>
          <h3 className="text-[14px] leading-5 font-medium text-foreground mb-2 flex items-center gap-2">
            <Icon name="extension" size={18} className="text-primary" />
            {feature.displayName}
          </h3>
          <Card variant="outlined">
            <CardContent className="p-0">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-variant/50">
                    <th className="w-12 px-3 py-2"></th>
                    <th className="px-3 py-2 text-left text-[12px] leading-4 font-medium text-muted-foreground">
                      Permission
                    </th>
                    <th className="px-3 py-2 text-left text-[12px] leading-4 font-medium text-muted-foreground">
                      Scope
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {feature.permissions.map((fp) => {
                    const assigned = rolePermissions?.permissions.find(
                      (rp) => rp.featurePermissionId === fp.id
                    );
                    const isEnabled = !!assigned;
                    const currentScope = (assigned?.scope as Scope) ?? "OWN";

                    return (
                      <tr key={fp.id} className="border-t border-outline-variant">
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={isEnabled}
                            disabled={isMutating}
                            onChange={(e) => {
                              onToggle(fp.id, (e.target as HTMLInputElement).checked, assigned?.id);
                            }}
                            className="w-10 h-10"
                          />
                        </td>
                        <td className={`px-3 py-2 ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                          {fp.displayName}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={currentScope}
                            disabled={!isEnabled || isMutating}
                            onValueChange={(value) => {
                              const newScope = value as Scope;
                              onScopeChange(fp.id, newScope, assigned?.id);
                            }}
                          >
                            <SelectTrigger
                              className={`h-8 w-40 text-[12px] font-medium ${isEnabled ? scopeColors[currentScope] : "text-muted-foreground"}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {scopeOptions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
