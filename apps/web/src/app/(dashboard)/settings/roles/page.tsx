"use client";

import { useState, useCallback } from "react";
import { Badge, SearchInput } from "@strata/ui";
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

  // Fetch permissions for the selected role
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
      // Remove old permission and add new one with updated scope
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
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Roles & Permissions</h1>
            <p className="text-xs text-muted-foreground">
              Manage roles and assign feature-level permissions with scope control.
            </p>
          </div>
        </AppBar>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Roles & Permissions</h1>
            <p className="text-xs text-muted-foreground">
              Manage roles and assign feature-level permissions with scope control.
            </p>
          </div>
        </AppBar>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            Failed to load roles. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Build the feature catalog from real backend data
  const featureCatalog: AdminFeature[] = allFeatures ?? [];

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Roles & Permissions</h1>
          <p className="text-xs text-muted-foreground">
            Manage roles and assign feature-level permissions with scope control.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDuplicateRole}
            disabled={createRoleMutation.isPending}
          >
            Duplicate Role
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            Create Role
          </Button>
        </div>
      </AppBar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Panel: Role List */}
        <div className="rounded-lg border border-border bg-background">
          <div className="border-b border-border p-3">
            <SearchInput
              value={roleSearch}
              onChange={setRoleSearch}
              placeholder="Search roles..."
            />
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {filteredRoles.map((role) => (
              <Button
                key={role.id}
                type="button"
                variant="ghost"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full h-auto border-b border-border rounded-none px-4 py-3 text-left justify-start transition-colors hover:bg-muted/50 ${
                  role.id === effectiveSelectedId ? "bg-muted/70" : ""
                }`}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{role.name}</span>
                    {role.isSystem && (
                      <Badge variant="info">System</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {role.description}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Right Panel: Permission Matrix */}
        {selectedRole && (
          <div className="rounded-lg border border-border bg-background">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedRole.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-4">
              {(permissionsLoading || featuresLoading) ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading permissions...</span>
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
          </div>
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
            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Finance Administrator"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateRole(); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                type="text"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Brief description of this role's responsibilities"
              />
            </div>
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
    </div>
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
      <p className="text-sm text-muted-foreground py-4">No features available.</p>
    );
  }

  return (
    <div className="space-y-6">
      {features.map((feature) => (
        <div key={feature.id}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {feature.displayName}
          </h3>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Permission
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Scope
                  </th>
                </tr>
              </thead>
              <tbody>
                {feature.permissions.map((fp) => {
                  // Find if this permission is assigned to the role
                  const assigned = rolePermissions?.permissions.find(
                    (rp) => rp.featurePermissionId === fp.id
                  );
                  const isEnabled = !!assigned;
                  const currentScope = (assigned?.scope as Scope) ?? "OWN";

                  return (
                    <tr key={fp.id} className="border-t border-border">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={isMutating}
                          onChange={(e) => {
                            onToggle(fp.id, e.target.checked, assigned?.id);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring disabled:opacity-50"
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
                            className={`h-7 w-[160px] text-xs font-medium ${isEnabled ? scopeColors[currentScope] : "text-muted-foreground"}`}
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
          </div>
        </div>
      ))}
    </div>
  );
}
