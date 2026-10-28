"use client";

import { useMemo } from "react";
import { OrgChartViewMode } from "@/lib/org-tree/types";
import { TopAppBar, FilterChip, AssistChip, SearchBar, Button } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { OrganizationUnit } from "@/services";
import { OrgUnitTreeSelect } from "@/components/ui/org-unit-tree-select";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FlowOrgHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** Hierarchical org unit tree (Division → Cluster → Squad …). */
  orgUnitTree: OrganizationUnit[];
  /** Selected org unit ids (cascades to descendants). */
  selectedUnitIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onClearSquads: () => void;
  totalCount: number;
  viewMode: OrgChartViewMode;
  onViewModeChange: (mode: OrgChartViewMode) => void;
  searchResultCount?: number;
  /** Ancestor path (root → matched person) shown as a clickable breadcrumb. */
  pathToRoot?: { id: string; name: string }[];
  /** Click a breadcrumb segment to focus the chart on that person. */
  onFocusPerson?: (personId: string) => void;
  /** Status text for filter/search (rendered below the toolbar) */
  statusText?: React.ReactNode;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Flatten the tree into id → name for resolving chip labels. */
function buildNameMap(nodes: OrganizationUnit[], map: Map<string, string> = new Map()): Map<string, string> {
  for (const node of nodes) {
    map.set(node.id, node.name);
    if (node.children?.length) buildNameMap(node.children, map);
  }
  return map;
}

/**
 * The "top" selected units: selected nodes whose parent isn't also selected.
 * Selecting a Division cascades every descendant id into the set, so we only
 * show a chip for the branch root to keep the chip row concise.
 */
function topSelectedIds(nodes: OrganizationUnit[], selected: Set<string>, parentSelected = false): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    const isSelected = selected.has(node.id);
    if (isSelected && !parentSelected) result.push(node.id);
    if (node.children?.length) {
      result.push(...topSelectedIds(node.children, selected, parentSelected || isSelected));
    }
  }
  return result;
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function FlowOrgHeader({
  search,
  onSearchChange,
  orgUnitTree,
  selectedUnitIds,
  onSelectionChange,
  onClearSquads,
  totalCount,
  viewMode,
  onViewModeChange,
  searchResultCount,
  pathToRoot,
  onFocusPerson,
  statusText,
}: FlowOrgHeaderProps) {
  const isAllView = selectedUnitIds.size === 0;
  const nameById = useMemo(() => buildNameMap(orgUnitTree), [orgUnitTree]);
  const chipIds = useMemo(
    () => topSelectedIds(orgUnitTree, selectedUnitIds),
    [orgUnitTree, selectedUnitIds],
  );

  // Find a node by id, then deselect it and its whole subtree.
  const deselectBranch = (id: string) => {
    const findNode = (nodes: OrganizationUnit[]): OrganizationUnit | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        const hit = n.children?.length ? findNode(n.children) : null;
        if (hit) return hit;
      }
      return null;
    };
    const collect = (node: OrganizationUnit, acc: string[] = []): string[] => {
      acc.push(node.id);
      for (const c of node.children ?? []) collect(c, acc);
      return acc;
    };
    const node = findNode(orgUnitTree);
    const next = new Set(selectedUnitIds);
    for (const rid of node ? collect(node) : [id]) next.delete(rid);
    onSelectionChange(next);
  };

  return (
    <div className="shrink-0 z-10">
      {/* ── Main toolbar ───────────────────────────────────────────────── */}
      <TopAppBar
        className="justify-between gap-4"
        title={
          <div className="flex items-center gap-4 shrink-0">
            <h1 className="text-headline-medium">Org Chart</h1>
            {/* Reporting / Departments view toggle (no SegmentedButton export — refined Button pill) */}
            <div className="flex items-center gap-1 bg-surface-container-highest/50 rounded-full p-1">
              <Button
                variant={viewMode === "reporting" ? "tonal" : "text"}
                size="xs"
                onClick={() => onViewModeChange("reporting")}
                className="rounded-full"
              >
                Reporting
              </Button>
              <Button
                variant={viewMode === "department" ? "tonal" : "text"}
                size="xs"
                onClick={() => onViewModeChange("department")}
                className="rounded-full"
              >
                Departments
              </Button>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-3 shrink-0 flex-1">
            {/* Center: search */}
            <SearchBar
          aria-label="Search"
              className="flex-1 max-w-xs"
              value={search}
              onChange={onSearchChange}
              placeholder="Search name, title, dept..."
            />
            {search.trim() && searchResultCount !== undefined && (
              <AssistChip className="shrink-0">
                {searchResultCount} {searchResultCount === 1 ? "result" : "results"}
              </AssistChip>
            )}
            {/* Hierarchy-aware org unit filter */}
            <OrgUnitTreeSelect
              tree={orgUnitTree}
              selectedIds={selectedUnitIds}
              onSelectionChange={onSelectionChange}
              placeholder={isAllView ? `Filter teams (${totalCount})…` : "Filter teams…"}
              className="w-64"
            />
          </div>
        }
      />

      {/* ── Filter chips + status + path ───────────────────────────────── */}
      {(!isAllView || statusText || (pathToRoot && pathToRoot.length > 0)) && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-outline-variant flex-wrap min-h-10">
          {/* Selected team chips */}
          {!isAllView && (
            <>
              {chipIds.map((id) => (
                <FilterChip
                  key={id}
                  selected={true}
                  trailingIcon={<Icon name="close" />}
                  onSelectedChange={() => deselectBranch(id)}
                >
                  {nameById.get(id) ?? id}
                </FilterChip>
              ))}
              <Button variant="text" size="xs" onClick={onClearSquads}>
                Clear
              </Button>
            </>
          )}

          {/* Status text (filter count, search feedback) */}
          {statusText}

          {/* Path to root — each segment focuses the chart on that person */}
          {pathToRoot && pathToRoot.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Icon name="route" size={16} className="text-primary" />
              {pathToRoot.map((node, i) => {
                const isLast = i === pathToRoot.length - 1;
                return (
                  <span key={node.id} className="flex items-center gap-1">
                    {i > 0 && <Icon name="chevron_right" size={16} className="text-outline" />}
                    <button
                      type="button"
                      onClick={() => onFocusPerson?.(node.id)}
                      className="cursor-pointer rounded px-1 py-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span
                        className={`text-label-small ${isLast ? "text-primary font-medium" : "text-on-surface-variant"}`}
                      >
                        {node.name}
                      </span>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
