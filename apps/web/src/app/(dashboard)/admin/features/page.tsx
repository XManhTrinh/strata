"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "@vkieu/mui";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Switch } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
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
}

function toFeatureRow(cf: CompanyFeature): FeatureRow | null {
  if (!cf.feature) return null;
  return {
    id: cf.feature.id,
    key: cf.feature.key,
    displayName: cf.feature.displayName,
    description: cf.feature.description ?? "",
    enabled: cf.enabled,
    permissionsCount: cf.feature.permissions?.length ?? 0,
    permissions: (cf.feature.permissions ?? []).map((p) => ({
      key: p.key,
      displayName: p.displayName,
      description: p.description ?? "",
    })),
    featureId: cf.featureId,
  };
}

export default function FeaturesPage() {
  const { data: companyFeatures, isLoading, error, refetch } = useFeatures(COMPANY_ID);
  const toggleFeatureMutation = useToggleFeature();
  const [search, setSearch] = useState("");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  const features: FeatureRow[] = (companyFeatures ?? []).map(toFeatureRow).filter((r): r is FeatureRow => r !== null);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Features</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              View registered features and control which are enabled for your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated">
          <CardContent className="p-6 space-y-4">
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
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Features</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              View registered features and control which are enabled for your organization.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load features
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              Failed to load features. Please try again later.
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
      <AppBar>
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Features</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            View registered features and control which are enabled for your organization.
          </p>
        </div>
      </AppBar>

      {/* Search */}
      <Search
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search features..."
      />

      {/* Desktop Table */}
      <Card variant="elevated" className="hidden md:block">
        <CardContent className="p-0">
          {filteredFeatures.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="extension" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No features found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground">
                {search ? "Try adjusting your search query." : "No features are registered yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Permissions</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.map((feature) => (
                  <TableRow
                    key={feature.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedFeatureId(expandedFeatureId === feature.id ? null : feature.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon name="extension" size={18} className="text-primary" />
                        <div>
                          <span className="text-[14px] font-medium text-surface-foreground">{feature.displayName}</span>
                          <span className="ml-2 text-[12px] text-surface-variant-foreground">({feature.key})</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[14px] text-surface-variant-foreground">
                      {feature.description}
                    </TableCell>
                    <TableCell className="text-center text-[14px] text-surface-variant-foreground">
                      {feature.permissionsCount}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={() => {
                          toggleEnabled(feature.featureId, feature.enabled, feature.displayName);
                        }}
                        disabled={toggleFeatureMutation.isPending}
                        aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.displayName}`}
                      />
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
        {filteredFeatures.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="extension" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No features found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground">
                {search ? "Try adjusting your search query." : "No features are registered yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeatures.map((feature) => (
            <Card
              key={feature.id}
              variant="elevated"
              className="cursor-pointer"
              onClick={() => setExpandedFeatureId(expandedFeatureId === feature.id ? null : feature.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="extension" size={20} className="text-primary" />
                    <div>
                      <p className="text-[14px] font-medium text-surface-foreground">{feature.displayName}</p>
                      <p className="text-[12px] text-surface-variant-foreground">{feature.key}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => {
                        toggleEnabled(feature.featureId, feature.enabled, feature.displayName);
                      }}
                      disabled={toggleFeatureMutation.isPending}
                      aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.displayName}`}
                    />
                  </div>
                </div>
                {feature.description && (
                  <p className="text-[12px] text-surface-variant-foreground mt-2">{feature.description}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                    <h3 className="text-[16px] leading-6 font-medium text-surface-foreground flex items-center gap-2">
                      <Icon name="key" size={20} className="text-primary" />
                      {feature.displayName} — Permissions
                    </h3>
                    <Chip variant="filter" selected={feature.enabled}>
                      {feature.enabled ? "Enabled" : "Disabled"}
                    </Chip>
                  </div>
                  <Divider />
                  <Card variant="elevated">
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
                              <TableCell className="font-mono text-[12px] text-surface-variant-foreground">
                                {feature.key}:{perm.key}
                              </TableCell>
                              <TableCell className="text-surface-foreground">{perm.displayName}</TableCell>
                              <TableCell className="text-surface-variant-foreground">{perm.description}</TableCell>
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
