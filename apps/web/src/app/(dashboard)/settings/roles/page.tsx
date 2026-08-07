"use client";

import { useState } from "react";
import { Badge, SearchInput } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useRoles, useCreateRole, COMPANY_ID, type AdminRole } from "@/services";

type Scope = "OWN" | "DIRECT_REPORTS" | "ORG_UNIT" | "BRANCH" | "COMPANY";

interface Permission {
  key: string;
  displayName: string;
  scope: Scope;
}

interface FeaturePermissions {
  featureKey: string;
  featureDisplayName: string;
  permissions: Permission[];
}

interface RoleWithPermissions {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  assignedUsers: number;
  permissions: FeaturePermissions[];
}

const scopeOptions: Scope[] = ["OWN", "DIRECT_REPORTS", "ORG_UNIT", "BRANCH", "COMPANY"];

const scopeColors: Record<Scope, string> = {
  OWN: "text-blue-600 dark:text-blue-400",
  DIRECT_REPORTS: "text-purple-600 dark:text-purple-400",
  ORG_UNIT: "text-amber-600 dark:text-amber-400",
  BRANCH: "text-green-600 dark:text-green-400",
  COMPANY: "text-red-600 dark:text-red-400",
};

/** All available features and their permissions (the full catalog) */
interface AvailablePermission {
  key: string;
  displayName: string;
}

interface AvailableFeature {
  key: string;
  displayName: string;
  permissions: AvailablePermission[];
}

const ALL_AVAILABLE_FEATURES: AvailableFeature[] = [
  {
    key: "leave",
    displayName: "Leave Management",
    permissions: [
      { key: "view_own", displayName: "View Own Requests" },
      { key: "submit_request", displayName: "Submit Request" },
      { key: "approve", displayName: "Approve Requests" },
      { key: "reject", displayName: "Reject Requests" },
      { key: "view_team", displayName: "View Team Requests" },
      { key: "manage_policies", displayName: "Manage Policies" },
    ],
  },
  {
    key: "employees",
    displayName: "Employee Directory",
    permissions: [
      { key: "view", displayName: "View Profiles" },
      { key: "edit", displayName: "Edit Profiles" },
      { key: "create", displayName: "Create Employees" },
      { key: "terminate", displayName: "Terminate Employees" },
      { key: "invite", displayName: "Invite Users" },
    ],
  },
  {
    key: "capacity",
    displayName: "Capacity Planning",
    permissions: [
      { key: "view_own", displayName: "View Own Allocation" },
      { key: "view_team", displayName: "View Team Allocation" },
      { key: "manage", displayName: "Manage Allocation" },
    ],
  },
  {
    key: "budgets",
    displayName: "Budget Management",
    permissions: [
      { key: "view", displayName: "View Budgets" },
      { key: "manage", displayName: "Manage Budgets" },
      { key: "approve", displayName: "Approve Budgets" },
    ],
  },
  {
    key: "org_chart",
    displayName: "Organization Chart",
    permissions: [
      { key: "view", displayName: "View Org Chart" },
      { key: "edit", displayName: "Edit Org Chart" },
    ],
  },
  {
    key: "calendar",
    displayName: "Calendar",
    permissions: [
      { key: "view_own", displayName: "View Own Calendar" },
      { key: "view_team", displayName: "View Team Calendar" },
      { key: "view_company", displayName: "View Company Calendar" },
      { key: "create_events", displayName: "Create Events" },
    ],
  },
  {
    key: "reports",
    displayName: "Reports",
    permissions: [
      { key: "view", displayName: "View Reports" },
      { key: "export", displayName: "Export Reports" },
      { key: "schedule", displayName: "Schedule Reports" },
    ],
  },
  {
    key: "authorization",
    displayName: "Authorization Management",
    permissions: [
      { key: "manage_roles", displayName: "Manage Roles" },
      { key: "manage_org_structure", displayName: "Manage Org Structure" },
      { key: "manage_positions", displayName: "Manage Positions" },
      { key: "manage_features", displayName: "Manage Features" },
      { key: "manage_reporting", displayName: "Manage Reporting" },
    ],
  },
];

/** Default permission matrix (client-side mock) for roles loaded from the backend */
const DEFAULT_ROLE_PERMISSIONS: Record<string, FeaturePermissions[]> = {
  Employee: [
    {
      featureKey: "leave",
      featureDisplayName: "Leave Management",
      permissions: [
        { key: "view_own", displayName: "View Own Requests", scope: "OWN" },
        { key: "submit_request", displayName: "Submit Request", scope: "OWN" },
      ],
    },
    {
      featureKey: "employees",
      featureDisplayName: "Employee Directory",
      permissions: [
        { key: "view", displayName: "View Profiles", scope: "COMPANY" },
      ],
    },
    {
      featureKey: "capacity",
      featureDisplayName: "Capacity Planning",
      permissions: [
        { key: "view_own", displayName: "View Own Allocation", scope: "OWN" },
      ],
    },
  ],
  Manager: [
    {
      featureKey: "leave",
      featureDisplayName: "Leave Management",
      permissions: [
        { key: "view_own", displayName: "View Own Requests", scope: "OWN" },
        { key: "submit_request", displayName: "Submit Request", scope: "OWN" },
        { key: "approve", displayName: "Approve Requests", scope: "DIRECT_REPORTS" },
        { key: "view_team", displayName: "View Team Requests", scope: "DIRECT_REPORTS" },
      ],
    },
    {
      featureKey: "employees",
      featureDisplayName: "Employee Directory",
      permissions: [
        { key: "view", displayName: "View Profiles", scope: "COMPANY" },
        { key: "edit", displayName: "Edit Profiles", scope: "DIRECT_REPORTS" },
      ],
    },
    {
      featureKey: "capacity",
      featureDisplayName: "Capacity Planning",
      permissions: [
        { key: "view_own", displayName: "View Own Allocation", scope: "OWN" },
        { key: "view_team", displayName: "View Team Allocation", scope: "DIRECT_REPORTS" },
        { key: "manage", displayName: "Manage Allocation", scope: "DIRECT_REPORTS" },
      ],
    },
  ],
  Admin: [
    {
      featureKey: "authorization",
      featureDisplayName: "Authorization Management",
      permissions: [
        { key: "manage_roles", displayName: "Manage Roles", scope: "COMPANY" },
        { key: "manage_org_structure", displayName: "Manage Org Structure", scope: "COMPANY" },
        { key: "manage_features", displayName: "Manage Features", scope: "COMPANY" },
      ],
    },
    {
      featureKey: "leave",
      featureDisplayName: "Leave Management",
      permissions: [
        { key: "view_own", displayName: "View Own Requests", scope: "OWN" },
        { key: "approve", displayName: "Approve Requests", scope: "COMPANY" },
        { key: "manage_policies", displayName: "Manage Policies", scope: "COMPANY" },
      ],
    },
    {
      featureKey: "employees",
      featureDisplayName: "Employee Directory",
      permissions: [
        { key: "view", displayName: "View Profiles", scope: "COMPANY" },
        { key: "edit", displayName: "Edit Profiles", scope: "COMPANY" },
        { key: "create", displayName: "Create Employees", scope: "COMPANY" },
        { key: "terminate", displayName: "Terminate Employees", scope: "COMPANY" },
      ],
    },
  ],
};

function toRoleWithPermissions(role: AdminRole): RoleWithPermissions {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    isSystem: role.isSystem,
    assignedUsers: 0,
    permissions: DEFAULT_ROLE_PERMISSIONS[role.name] ?? [],
  };
}

export default function RolesPage() {
  const { data: backendRoles, isLoading, error } = useRoles(COMPANY_ID);
  const createRoleMutation = useCreateRole();

  const [localRoles, setLocalRoles] = useState<RoleWithPermissions[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  // Merge backend roles with local permission state
  const roles: RoleWithPermissions[] = backendRoles
    ? backendRoles.map((r) => {
        const localOverride = localRoles.find((lr) => lr.id === r.id);
        if (localOverride) return localOverride;
        return toRoleWithPermissions(r);
      })
    : [];

  const effectiveSelectedId = selectedRoleId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((r) => r.id === effectiveSelectedId) ?? roles[0];

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.description.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate(
      { companyId: COMPANY_ID, name: newRoleName.trim(), description: newRoleDescription.trim() || undefined },
      {
        onSuccess: (newRole) => {
          setSelectedRoleId(newRole.id);
          setNewRoleName("");
          setNewRoleDescription("");
          setShowCreateModal(false);
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
          // Copy permissions locally
          const duplicated: RoleWithPermissions = {
            ...toRoleWithPermissions(newRole),
            permissions: [...selectedRole.permissions],
          };
          setLocalRoles((prev) => [...prev, duplicated]);
          setSelectedRoleId(newRole.id);
        },
      }
    );
  };

  const updateLocalPermissions = (roleId: string, updater: (perms: FeaturePermissions[]) => FeaturePermissions[]) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const updated: RoleWithPermissions = { ...role, permissions: updater(role.permissions) };
    setLocalRoles((prev) => {
      const existing = prev.findIndex((r) => r.id === roleId);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = updated;
        return copy;
      }
      return [...prev, updated];
    });
  };

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
          <button
            type="button"
            onClick={handleDuplicateRole}
            disabled={createRoleMutation.isPending}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Duplicate Role
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Role
          </button>
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
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  role.id === effectiveSelectedId ? "bg-muted/70" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{role.name}</span>
                  {role.isSystem && (
                    <Badge variant="info">System</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {role.description}
                </p>
              </button>
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
              <div className="space-y-6">
                {ALL_AVAILABLE_FEATURES.map((feature) => {
                  const roleFeaturePerms = selectedRole.permissions.find(
                    (fp) => fp.featureKey === feature.key
                  );

                  return (
                    <div key={feature.key}>
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
                            {feature.permissions.map((availPerm) => {
                              const assignedPerm = roleFeaturePerms?.permissions.find(
                                (p) => p.key === availPerm.key
                              );
                              const isEnabled = !!assignedPerm;
                              const currentScope = assignedPerm?.scope ?? "OWN";

                              return (
                                <tr key={availPerm.key} className="border-t border-border">
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={(e) => {
                                        updateLocalPermissions(selectedRole.id, (perms) => {
                                          const updatedPermissions = [...perms];
                                          const featureIdx = updatedPermissions.findIndex(
                                            (fp) => fp.featureKey === feature.key
                                          );

                                          if (e.target.checked) {
                                            const newPerm: Permission = {
                                              key: availPerm.key,
                                              displayName: availPerm.displayName,
                                              scope: "OWN",
                                            };
                                            if (featureIdx >= 0) {
                                              updatedPermissions[featureIdx] = {
                                                ...updatedPermissions[featureIdx],
                                                permissions: [
                                                  ...updatedPermissions[featureIdx].permissions,
                                                  newPerm,
                                                ],
                                              };
                                            } else {
                                              updatedPermissions.push({
                                                featureKey: feature.key,
                                                featureDisplayName: feature.displayName,
                                                permissions: [newPerm],
                                              });
                                            }
                                          } else {
                                            if (featureIdx >= 0) {
                                              const filtered = updatedPermissions[featureIdx].permissions.filter(
                                                (p) => p.key !== availPerm.key
                                              );
                                              if (filtered.length === 0) {
                                                updatedPermissions.splice(featureIdx, 1);
                                              } else {
                                                updatedPermissions[featureIdx] = {
                                                  ...updatedPermissions[featureIdx],
                                                  permissions: filtered,
                                                };
                                              }
                                            }
                                          }

                                          return updatedPermissions;
                                        });
                                      }}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                                    />
                                  </td>
                                  <td className={`px-3 py-2 ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                    {availPerm.displayName}
                                  </td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={currentScope}
                                      disabled={!isEnabled}
                                      onChange={(e) => {
                                        const newScope = e.target.value as Scope;
                                        updateLocalPermissions(selectedRole.id, (perms) =>
                                          perms.map((fp) => {
                                            if (fp.featureKey !== feature.key) return fp;
                                            return {
                                              ...fp,
                                              permissions: fp.permissions.map((p) =>
                                                p.key === availPerm.key ? { ...p, scope: newScope } : p
                                              ),
                                            };
                                          })
                                        );
                                      }}
                                      className={`rounded border border-border bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed ${isEnabled ? scopeColors[currentScope] : "text-muted-foreground"}`}
                                    >
                                      {scopeOptions.map((s) => (
                                        <option key={s} value={s}>
                                          {s.replace(/_/g, " ")}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Create Role</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new role. You can assign permissions after creation.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="role-name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Finance Administrator"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateRole(); }}
                />
              </div>
              <div>
                <label htmlFor="role-desc" className="block text-sm font-medium text-foreground">
                  Description
                </label>
                <input
                  id="role-desc"
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Brief description of this role's responsibilities"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setNewRoleName(""); setNewRoleDescription(""); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createRoleMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
