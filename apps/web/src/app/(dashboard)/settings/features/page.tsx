"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface FeaturePermission {
  key: string;
  displayName: string;
  description: string;
}

interface Feature {
  id: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  permissionsCount: number;
  permissions: FeaturePermission[];
  [key: string]: unknown;
}

const mockFeatures: Feature[] = [
  {
    id: "f-1",
    key: "leave",
    displayName: "Leave Management",
    description: "Employee leave request and approval workflow",
    enabled: true,
    permissionsCount: 5,
    permissions: [
      { key: "view_own", displayName: "View Own Requests", description: "View own leave requests" },
      { key: "submit_request", displayName: "Submit Request", description: "Submit a leave request" },
      { key: "approve", displayName: "Approve Requests", description: "Approve leave requests" },
      { key: "view_team", displayName: "View Team Requests", description: "View team leave requests" },
      { key: "manage_policies", displayName: "Manage Policies", description: "Configure leave policies" },
    ],
  },
  {
    id: "f-2",
    key: "employees",
    displayName: "Employee Directory",
    description: "Employee profile management and directory access",
    enabled: true,
    permissionsCount: 4,
    permissions: [
      { key: "view", displayName: "View Profiles", description: "View employee profiles" },
      { key: "edit", displayName: "Edit Profiles", description: "Edit employee profiles" },
      { key: "create", displayName: "Create Employees", description: "Create new employee records" },
      { key: "terminate", displayName: "Terminate Employees", description: "Terminate employee records" },
    ],
  },
  {
    id: "f-3",
    key: "capacity",
    displayName: "Capacity Planning",
    description: "Resource allocation and capacity management",
    enabled: true,
    permissionsCount: 3,
    permissions: [
      { key: "view_own", displayName: "View Own Allocation", description: "View own capacity allocation" },
      { key: "view_team", displayName: "View Team Allocation", description: "View team capacity allocation" },
      { key: "manage", displayName: "Manage Allocation", description: "Manage capacity allocation" },
    ],
  },
  {
    id: "f-4",
    key: "budgets",
    displayName: "Budget Management",
    description: "Financial planning and budget tracking",
    enabled: true,
    permissionsCount: 3,
    permissions: [
      { key: "view", displayName: "View Budgets", description: "View budget data" },
      { key: "manage", displayName: "Manage Budgets", description: "Create and update budgets" },
      { key: "approve", displayName: "Approve Budgets", description: "Approve budget requests" },
    ],
  },
  {
    id: "f-5",
    key: "engineering",
    displayName: "Engineering Metrics",
    description: "Engineering productivity and DORA metrics",
    enabled: false,
    permissionsCount: 2,
    permissions: [
      { key: "view", displayName: "View Metrics", description: "View engineering metrics" },
      { key: "manage", displayName: "Manage Metrics", description: "Configure metric dashboards" },
    ],
  },
  {
    id: "f-6",
    key: "authorization",
    displayName: "Authorization Management",
    description: "Manage roles, permissions, and organization structure",
    enabled: true,
    permissionsCount: 3,
    permissions: [
      { key: "manage_roles", displayName: "Manage Roles", description: "Create and edit roles" },
      { key: "manage_org_structure", displayName: "Manage Org Structure", description: "Edit organization structure" },
      { key: "manage_features", displayName: "Manage Features", description: "Enable/disable features" },
    ],
  },
];

export default function FeaturesPage() {
  const [search, setSearch] = useState("");
  const [features, setFeatures] = useState(mockFeatures);
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  const toggleEnabled = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const filteredFeatures = features.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Feature>[] = [
    {
      key: "displayName",
      header: "Feature",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.displayName}</span>
          <span className="ml-2 text-xs text-muted-foreground">({row.key})</span>
        </div>
      ),
    },
    { key: "description", header: "Description" },
    {
      key: "permissionsCount",
      header: "Permissions",
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">{row.permissionsCount}</span>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleEnabled(row.id);
          }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            row.enabled ? "bg-primary" : "bg-muted"
          }`}
          role="switch"
          aria-checked={row.enabled}
          aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.displayName}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              row.enabled ? "translate-x-4.5" : "translate-x-1"
            }`}
          />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Features</h1>
          <p className="text-xs text-muted-foreground">
            View registered features and control which are enabled for your organization.
          </p>
        </div>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search features..."
        />
      </div>

      <DataTable<Feature>
        columns={columns}
        data={filteredFeatures}
        pageSize={10}
        emptyMessage="No features found"
        onRowClick={(row) =>
          setExpandedFeatureId(expandedFeatureId === row.id ? null : row.id)
        }
      />

      {/* Feature Detail Panel */}
      {expandedFeatureId && (
        <div className="rounded-lg border border-border bg-background p-4">
          {(() => {
            const feature = features.find((f) => f.id === expandedFeatureId);
            if (!feature) return null;
            return (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.displayName} — Permissions
                  </h3>
                  <Badge variant={feature.enabled ? "success" : "default"}>
                    {feature.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="mt-3 rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feature.permissions.map((perm) => (
                        <tr key={perm.key} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {feature.key}:{perm.key}
                          </td>
                          <td className="px-3 py-2 text-foreground">{perm.displayName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{perm.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
