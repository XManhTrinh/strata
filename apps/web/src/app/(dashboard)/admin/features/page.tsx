"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SearchBar,
  TopAppBar,
  Card,
  AssistChip,
  Switch,
  Dialog, DialogContent, DialogTitle, DialogActions,
  Button,
} from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Skeleton, SkeletonGroup } from "@vkieu/mui/vk";
import { useToast } from "@/hooks/use-toast";
import { useFeatures, useToggleFeature, type CompanyFeature } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

// ─── Feature metadata ─────────────────────────────────────────────────────────

const FEATURE_META: Record<string, { icon: string; color: string; bg: string }> = {
  calendar:  { icon: "calendar_month",    color: "text-primary",     bg: "bg-primary-container" },
  people:    { icon: "group",             color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30" },
  org_chart: { icon: "lan",              color: "text-lime-600",    bg: "bg-lime-100 dark:bg-lime-900/30" },
  budgeting: { icon: "payments",          color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  dashboard: { icon: "dashboard",         color: "text-sky-600",     bg: "bg-sky-100 dark:bg-sky-900/30" },
  capacity:  { icon: "stacked_bar_chart", color: "text-cyan-600",    bg: "bg-cyan-100 dark:bg-cyan-900/30" },
};

const DEFAULT_META = { icon: "extension", color: "text-primary", bg: "bg-primary/10" };
const ACTIVE_FEATURES = new Set(["people", "org_chart", "budgeting", "calendar", "dashboard", "capacity"]);

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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} variant="outlined">
          <SkeletonGroup label="Loading features">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-12 w-12" corner="extra-large" />
                <Skeleton className="h-7 w-12" corner="full" />
              </div>
              <Skeleton className="h-5 w-32" corner="extra-small" />
              <Skeleton className="h-4 w-full" corner="extra-small" />
              <Skeleton className="h-4 w-2/3" corner="extra-small" />
            </CardContent>
          </SkeletonGroup>
        </Card>
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card variant="elevated" className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-12 px-8 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
          <Icon name="error" size={24} className="text-error" />
        </div>
        <h2 className="text-title-large mb-2">Unable to load features</h2>
        <p className="text-body-medium text-on-surface-variant mb-6">
          Something went wrong. Please try again.
        </p>
        <Button variant="tonal" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
          <Icon name="extension" size={40} className="text-primary" />
        </div>
        <h2 className="text-title-large mb-2">No features found</h2>
        <p className="text-body-medium text-on-surface-variant">
          {hasSearch ? "Try adjusting your search query." : "No features are registered yet."}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  feature,
  isExpanded,
  onToggle,
  onExpand,
  isToggling,
  reduced,
}: {
  feature: FeatureRow;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  isToggling: boolean;
  reduced: boolean;
}) {
  const meta = FEATURE_META[feature.key] ?? DEFAULT_META;

  return (
    <Card
      variant="outlined"
      className={`transition-all hover:shadow-md ${!feature.enabled ? "opacity-60" : ""} ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
    >
      <CardContent className="p-5">
        {/* Icon + toggle */}
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center h-12 w-12 rounded-xl ${meta.bg}`}>
            <Icon name={meta.icon} size={28} className={meta.color} />
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              selected={feature.enabled}
              onSelectedChange={onToggle}
              disabled={isToggling}
              aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.displayName}`}
            />
          </div>
        </div>

        {/* Title + key */}
        <h3 className="text-title-medium">{feature.displayName}</h3>
        <span className="text-label-small text-on-surface-variant font-mono mt-0.5">
          {feature.key}
        </span>

        {/* Description */}
        <p className="text-body-small text-on-surface-variant mt-2 line-clamp-2">
          {feature.description || "No description available."}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/50">
          <AssistChip>
            {feature.permissionsCount} permission{feature.permissionsCount !== 1 ? "s" : ""}
          </AssistChip>
          <Button
            variant="text"
            onClick={onExpand}
            className="text-label-large h-8"
            trailingIcon={<Icon name={isExpanded ? "expand_less" : "expand_more"} />}
          >
            {isExpanded ? "Hide" : "Details"}
          </Button>
        </div>

        {/* Expanded permissions list */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-3 border-t border-outline-variant/50 space-y-2.5">
                {feature.permissions.map((perm) => (
                  <div key={perm.key} className="flex items-start gap-2.5">
                    <Icon name="key" size={14} className="text-on-surface-variant mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-label-large">{perm.displayName}</span>
                      <span className="text-label-small text-on-surface-variant font-mono block">
                        {feature.key}:{perm.key}
                      </span>
                    </div>
                  </div>
                ))}
                {feature.permissions.length === 0 && (
                  <p className="text-body-small text-on-surface-variant">
                    No permissions defined for this feature.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const reduced = useReducedMotionContext();
  const toast = useToast();
  const companyId = useCompanyId();
  const { data: companyFeatures, isLoading, error, refetch } = useFeatures(companyId);
  const toggleFeatureMutation = useToggleFeature();

  const [search, setSearch] = useState("");
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────
  const features = useMemo<FeatureRow[]>(
    () =>
      (companyFeatures ?? [])
        .map(toFeatureRow)
        .filter((r): r is FeatureRow => r !== null && ACTIVE_FEATURES.has(r.key)),
    [companyFeatures],
  );

  const filteredFeatures = useMemo(() => {
    if (!search) return features;
    const lower = search.toLowerCase();
    return features.filter(
      (f) =>
        f.displayName.toLowerCase().includes(lower) ||
        f.description.toLowerCase().includes(lower) ||
        f.key.toLowerCase().includes(lower),
    );
  }, [features, search]);

  const enabledCount = features.filter((f) => f.enabled).length;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (featureId: string, currentEnabled: boolean, displayName: string) => {
      toggleFeatureMutation.mutate(
        { companyId, featureId, enabled: !currentEnabled },
        {
          onSuccess: () => toast.success(`"${displayName}" ${!currentEnabled ? "enabled" : "disabled"}`),
          onError: (err) => toast.error(err.message || "Failed to toggle feature"),
        },
      );
    },
    [companyId, toggleFeatureMutation, toast],
  );

  // ── Page header (shared across states) ─────────────────────────────────
  const header = (
    <TopAppBar
      title={<h1 className="text-headline-medium">Features</h1>}
      subtitle={!isLoading && features.length > 0 ? `Control which features are enabled for your workspace. ${enabledCount} of ${features.length} active.` : "Control which features are enabled for your workspace."}
    />
  );

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <GridSkeleton />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {header}

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <SearchBar aria-label="Search" className="max-w-sm" value={search} onChange={setSearch} placeholder="Search features..." />
        {enabledCount > 0 && (
          <AssistChip className="shrink-0">
            {enabledCount} enabled
          </AssistChip>
        )}
      </div>

      {/* Grid */}
      {filteredFeatures.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isExpanded={expandedFeatureId === feature.id}
              onToggle={() => handleToggle(feature.featureId, feature.enabled, feature.displayName)}
              onExpand={() => setExpandedFeatureId(expandedFeatureId === feature.id ? null : feature.id)}
              isToggling={toggleFeatureMutation.isPending}
              reduced={reduced}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
