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
import { toast } from "sonner";
import { useFeatures, useToggleFeature, type CompanyFeature } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Feature icon & color mapping ─────────────────────────────────────────────

const FEATURE_META: Record<string, { icon: string; color: string; bg: string }> = {
  calendar:      { icon: "calendar_month",       color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/30" },
  people:        { icon: "group",                color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  org_chart:     { icon: "lan",                  color: "text-lime-600",    bg: "bg-lime-100 dark:bg-lime-900/30" },
  budgeting:     { icon: "payments",             color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  dashboard:     { icon: "dashboard",            color: "text-sky-600",     bg: "bg-sky-100 dark:bg-sky-900/30" },
};

const DEFAULT_META = { icon: "extension", color: "text-primary", bg: "bg-primary/10" };

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const companyId = useCompanyId();
  const { data: companyFeatures, isLoading, error, refetch } = useFeatures(companyId);
  const toggleFeatureMutation = useToggleFeature();
  const [search, setSearch] = useState("");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  // Core features (always on) are hidden — only toggleable features shown
  const HIDDEN_FEATURES = new Set(["authorization"]);
  const features: FeatureRow[] = (companyFeatures ?? [])
    .map(toFeatureRow)
    .filter((r): r is FeatureRow => r !== null && !HIDDEN_FEATURES.has(r.key));

  const toggleEnabled = (featureId: string, currentEnabled: boolean, displayName: string) => {
    toggleFeatureMutation.mutate(
      { companyId, featureId, enabled: !currentEnabled },
      {
        onSuccess: () => toast.success(`"${displayName}" ${!currentEnabled ? "enabled" : "disabled"}`),
        onError: (err) => toast.error(err.message || "Failed to toggle feature"),
      },
    );
  };

  const filteredFeatures = features.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()),
  );

  const enabledCount = features.filter((f) => f.enabled).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Features</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Control which features are enabled for your workspace.
            </p>
          </div>
        </AppBar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="outlined">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-7 w-12 rounded-full" />
                </div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
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
              Control which features are enabled for your workspace.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">Unable to load features</h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">Something went wrong. Please try again.</p>
            <Button variant="tonal" onClick={() => refetch()}>
              <Icon name="refresh" size={18} /> Retry
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
            Control which features are enabled for your workspace.{" "}
            <span className="font-medium text-surface-foreground">
              {enabledCount} of {features.length}
            </span>{" "}
            active.
          </p>
        </div>
      </AppBar>

      {/* Search */}
      <Search className="max-w-sm" value={search} onValueChange={setSearch} placeholder="Search features..." />

      {/* Cards Grid */}
      {filteredFeatures.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
              <Icon name="extension" size={24} className="text-surface-variant-foreground" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">No features found</h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              {search ? "Try adjusting your search query." : "No features are registered yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feature) => {
            const meta = FEATURE_META[feature.key] ?? DEFAULT_META;
            const isExpanded = expandedFeatureId === feature.id;

            return (
              <Card
                key={feature.id}
                variant="outlined"
                className={`transition-all hover:shadow-md ${
                  !feature.enabled ? "opacity-60" : ""
                } ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
              >
                <CardContent className="p-5">
                  {/* Top row: icon + toggle */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${meta.bg}`}>
                      <Icon name={meta.icon} size={28} className={meta.color} />
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={() => toggleEnabled(feature.featureId, feature.enabled, feature.displayName)}
                        disabled={toggleFeatureMutation.isPending}
                        aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.displayName}`}
                      />
                    </div>
                  </div>

                  {/* Title + key */}
                  <h3 className="text-[16px] leading-6 font-medium text-surface-foreground">
                    {feature.displayName}
                  </h3>
                  <p className="text-[12px] leading-4 text-surface-variant-foreground mt-0.5 font-mono">
                    {feature.key}
                  </p>

                  {/* Description */}
                  <p className="text-[13px] leading-5 text-surface-variant-foreground mt-2 line-clamp-2">
                    {feature.description || "No description available."}
                  </p>

                  {/* Footer: permissions count + expand */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/50">
                    <Chip variant="filter" selected={feature.enabled}>
                      {feature.permissionsCount} permission{feature.permissionsCount !== 1 ? "s" : ""}
                    </Chip>
                    <button
                      type="button"
                      onClick={() => setExpandedFeatureId(isExpanded ? null : feature.id)}
                      className="flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {isExpanded ? "Hide" : "Details"}
                      <Icon name={isExpanded ? "expand_less" : "expand_more"} size={16} />
                    </button>
                  </div>

                  {/* Expanded permissions */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-outline-variant/50 space-y-2">
                      {feature.permissions.map((perm) => (
                        <div key={perm.key} className="flex items-start gap-2">
                          <Icon name="key" size={14} className="text-surface-variant-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[13px] font-medium text-surface-foreground">{perm.displayName}</p>
                            <p className="text-[11px] text-surface-variant-foreground font-mono">
                              {feature.key}:{perm.key}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
