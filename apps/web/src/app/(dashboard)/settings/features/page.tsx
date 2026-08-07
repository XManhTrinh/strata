"use client";

import { useState } from "react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
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

  const toggleEnabled = (featureId: string, currentEnabled: boolean, displayName: string) => {
    toggleFeatureMutation.mutate(
      {
        companyId: COMPANY_ID,
        featureId,
        enabled: !currentEnabled,
      },
      {
        onSuccess: () => {
          toast.success(
            `Feature "${displayName}" ${!currentEnabled ? "enabled" : "disabled"} successfully`
          );
        },
        onError: (err) => {
          toast.error(err.message || "Failed to toggle feature");
        },
      }
    );
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
        <Switch
          checked={row.enabled}
          onChange={(e) => {
            e.stopPropagation();
            toggleEnabled(row.featureId, row.enabled, row.displayName);
          }}
          disabled={toggleFeatureMutation.isPending}
          aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.displayName}`}
          size="small"
        />
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

      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search features..."
      />

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feature.permissions.map((perm) => (
                        <TableRow key={perm.key}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {feature.key}:{perm.key}
                          </TableCell>
                          <TableCell className="text-foreground">{perm.displayName}</TableCell>
                          <TableCell className="text-muted-foreground">{perm.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
