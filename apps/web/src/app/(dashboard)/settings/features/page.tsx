"use client";

import { useState } from "react";
import { DataTable, Badge, SearchInput, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useFeatures, useToggleFeature, COMPANY_ID, type CompanyFeature } from "@/services";

interface FeatureRow {
  id: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  permissionsCount: number;
  permissions: { key: string; displayName: string; description: string }[];
  featureId: string;
  [key: string]: unknown;
}

function toFeatureRow(cf: CompanyFeature): FeatureRow {
  return {
    id: cf.feature.id,
    key: cf.feature.key,
    displayName: cf.feature.displayName,
    description: cf.feature.description ?? "",
    enabled: cf.enabled,
    permissionsCount: cf.feature.permissions.length,
    permissions: cf.feature.permissions.map((p) => ({
      key: p.key,
      displayName: p.displayName,
      description: p.description ?? "",
    })),
    featureId: cf.featureId,
  };
}

export default function FeaturesPage() {
  const { data: companyFeatures, isLoading, error } = useFeatures(COMPANY_ID);
  const toggleFeatureMutation = useToggleFeature();
  const [search, setSearch] = useState("");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  const features: FeatureRow[] = companyFeatures?.map(toFeatureRow) ?? [];

  const toggleEnabled = (featureId: string, currentEnabled: boolean) => {
    toggleFeatureMutation.mutate({
      companyId: COMPANY_ID,
      featureId,
      enabled: !currentEnabled,
    });
  };

  const filteredFeatures = features.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<FeatureRow>[] = [
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
            toggleEnabled(row.featureId, row.enabled);
          }}
          disabled={toggleFeatureMutation.isPending}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            row.enabled ? "bg-primary" : "bg-muted"
          } disabled:opacity-50`}
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

  if (isLoading) {
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
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            Failed to load features. Please try again later.
          </p>
        </div>
      </div>
    );
  }

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

      <DataTable<FeatureRow>
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
