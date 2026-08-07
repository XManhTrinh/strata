"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@/components/ui/divider";
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
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
        <div className="flex items-center gap-2">
          <Icon name="extension" size={18} className="text-primary" />
          <div>
            <span className="text-[14px] font-medium text-foreground">{row.displayName}</span>
            <span className="ml-2 text-[12px] text-muted-foreground">({row.key})</span>
          </div>
        </div>
      ),
    },
    { key: "description", header: "Description" },
    {
      key: "permissionsCount",
      header: "Permissions",
      sortable: true,
      render: (row) => (
        <span className="text-[14px] text-muted-foreground">{row.permissionsCount}</span>
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
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Features</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              View registered features and control which are enabled for your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="outlined">
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Features</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              View registered features and control which are enabled for your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              Failed to load features. Please try again later.
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
      <AppBar>
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Features</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            View registered features and control which are enabled for your organization.
          </p>
        </div>
      </AppBar>

      {/* Search */}
      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search features..."
      />

      {/* DataTable */}
      <Card variant="outlined">
        <CardContent className="p-0">
          <DataTable<FeatureRow>
            columns={columns}
            data={filteredFeatures}
            pageSize={10}
            emptyMessage="No features found"
            onRowClick={(row) =>
              setExpandedFeatureId(expandedFeatureId === row.id ? null : row.id)
            }
          />
        </CardContent>
      </Card>

      {/* Feature Detail Panel */}
      {expandedFeatureId && (
        <Card variant="elevated">
          <CardContent className="p-6">
            {(() => {
              const feature = features.find((f) => f.id === expandedFeatureId);
              if (!feature) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] leading-6 font-medium text-foreground flex items-center gap-2">
                      <Icon name="key" size={20} className="text-primary" />
                      {feature.displayName} — Permissions
                    </h3>
                    <Badge variant={feature.enabled ? "success" : "default"}>
                      {feature.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <Divider />
                  <Card variant="outlined">
                    <CardContent className="p-0">
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
                              <TableCell className="font-mono text-[12px] text-muted-foreground">
                                {feature.key}:{perm.key}
                              </TableCell>
                              <TableCell className="text-foreground">{perm.displayName}</TableCell>
                              <TableCell className="text-muted-foreground">{perm.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
