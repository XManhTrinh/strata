"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@/components/ui/chips";
import { List, ListItem } from "@/components/ui/list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import {
  useOrgChart,
  useOrgChartByUnit,
  useOrgUnits,
  type OrgTreeNode,
} from "@/services";

const COMPANY_ID = "cm_acme_corp_001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── OrgTreeNodeCard ──────────────────────────────────────────────────────────

function OrgTreeNodeCard({
  node,
  depth = 0,
}: {
  node: OrgTreeNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasReports = node.directReports.length > 0;
  const initials = getInitials(node.fullName);

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <Card variant="outlined" className="mb-2">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/12 text-primary text-sm font-medium shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-surface-foreground truncate">
              {node.fullName}
            </p>
            <p className="text-xs text-surface-variant-foreground truncate">
              {node.positionTitle ?? "No position"}
              {node.departmentName && ` · ${node.departmentName}`}
            </p>
          </div>
          {hasReports && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <Icon
                name={expanded ? "expand_less" : "expand_more"}
                size={20}
              />
            </Button>
          )}
        </CardContent>
      </Card>
      {expanded &&
        hasReports &&
        node.directReports.map((child) => (
          <OrgTreeNodeCard key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

// ─── Reporting Tree Skeleton ──────────────────────────────────────────────────

function TreeSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ marginLeft: i > 1 ? 24 : 0 }}>
          <Card variant="outlined" className="mb-2">
            <CardContent className="flex items-center gap-3 p-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ─── Reporting View ───────────────────────────────────────────────────────────

function ReportingView() {
  const { data: tree, isLoading, error } = useOrgChart(COMPANY_ID);

  if (isLoading) return <TreeSkeleton />;

  if (error) {
    return (
      <Card variant="filled" className="p-4">
        <div className="flex items-center gap-2 text-error">
          <Icon name="error" size={20} />
          <p className="text-sm">
            Failed to load org chart: {error.message}
          </p>
        </div>
      </Card>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <Card variant="outlined" className="p-6">
        <div className="flex flex-col items-center gap-2 text-surface-variant-foreground">
          <Icon name="account_tree" size={40} />
          <p className="text-sm">No reporting relationships found.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((root) => (
        <OrgTreeNodeCard key={root.id} node={root} depth={0} />
      ))}
    </div>
  );
}

// ─── Teams View ───────────────────────────────────────────────────────────────

function TeamsView() {
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const { data: units, isLoading: unitsLoading } = useOrgUnits(COMPANY_ID);
  const { data: unitView, isLoading: unitViewLoading, error: unitViewError } =
    useOrgChartByUnit(COMPANY_ID, selectedUnitId || undefined);

  return (
    <div className="space-y-4">
      {/* Unit selector */}
      <div className="flex items-center gap-3">
        <Icon name="corporate_fare" size={20} className="text-surface-variant-foreground" />
        <select
          value={selectedUnitId}
          onChange={(e) => setSelectedUnitId(e.target.value)}
          disabled={unitsLoading}
          className="flex-1 h-10 px-3 rounded-lg border border-outline bg-transparent text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select an organizational unit…</option>
          {units?.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
              {unit.type ? ` (${unit.type.name})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {unitViewLoading && selectedUnitId && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Error state */}
      {unitViewError && (
        <Card variant="filled" className="p-4">
          <div className="flex items-center gap-2 text-error">
            <Icon name="error" size={20} />
            <p className="text-sm">
              Failed to load unit: {unitViewError.message}
            </p>
          </div>
        </Card>
      )}

      {/* Unit view content */}
      {unitView && !unitViewLoading && (
        <>
          {/* Ancestor breadcrumb */}
          {unitView.parentChain.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {unitView.parentChain.map((ancestor, idx) => (
                <div key={ancestor.id} className="flex items-center gap-1">
                  {idx > 0 && (
                    <Icon
                      name="chevron_right"
                      size={18}
                      className="text-surface-variant-foreground"
                    />
                  )}
                  <Chip variant="assist" leadingIcon="apartment">
                    {ancestor.name}
                  </Chip>
                </div>
              ))}
              <Icon
                name="chevron_right"
                size={18}
                className="text-surface-variant-foreground"
              />
              <Chip variant="filter" selected leadingIcon="group">
                {unitView.unit.name}
              </Chip>
            </div>
          )}

          {/* Employee list */}
          {unitView.employees.length > 0 ? (
            <Card variant="outlined">
              <List dividers>
                {unitView.employees.map((emp) => (
                  <ListItem
                    key={emp.id}
                    headline={emp.fullName}
                    supportingText={emp.positionTitle ?? "No position assigned"}
                    leadingIcon="person"
                    trailingContent={
                      <Chip
                        variant="filter"
                        selected={emp.status === "active"}
                      >
                        {emp.status}
                      </Chip>
                    }
                    lines={2}
                    interactive={false}
                  />
                ))}
              </List>
            </Card>
          ) : (
            <Card variant="outlined" className="p-6">
              <div className="flex flex-col items-center gap-2 text-surface-variant-foreground">
                <Icon name="group_off" size={40} />
                <p className="text-sm">No employees in this unit.</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Empty prompt */}
      {!selectedUnitId && !unitsLoading && (
        <Card variant="outlined" className="p-6">
          <div className="flex flex-col items-center gap-2 text-surface-variant-foreground">
            <Icon name="touch_app" size={40} />
            <p className="text-sm">Select a unit above to view its members.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
      className="flex flex-col gap-4 p-6"
    >
      {/* App Bar */}
      <AppBar>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-surface-foreground">
            Org Chart
          </h1>
          <p className="text-sm text-surface-variant-foreground">
            Reporting hierarchy and team structure
          </p>
        </div>
      </AppBar>

      {/* Tabs */}
      <Tabs defaultValue="reporting">
        <TabsList>
          <TabsTrigger value="reporting">
            <Icon name="account_tree" size={18} className="mr-2" />
            Reporting
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Icon name="groups" size={18} className="mr-2" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reporting">
          <ReportingView />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsView />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
