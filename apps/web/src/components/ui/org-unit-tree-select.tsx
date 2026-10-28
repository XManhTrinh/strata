"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Checkbox, SearchBar, Button } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import type { OrganizationUnit } from "@/services";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Collect all descendant IDs (inclusive) for a tree node. */
function collectIds(node: OrganizationUnit): string[] {
  const ids = [node.id];
  for (const child of node.children ?? []) {
    ids.push(...collectIds(child));
  }
  return ids;
}

/** Flatten tree into a list of { node, depth } for rendering. */
interface FlatNode {
  node: OrganizationUnit;
  depth: number;
  hasChildren: boolean;
}

function flattenTree(
  nodes: OrganizationUnit[],
  depth: number,
  expandedIds: Set<string>,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    const children = node.children ?? [];
    result.push({ node, depth, hasChildren: children.length > 0 });
    if (children.length > 0 && expandedIds.has(node.id)) {
      result.push(...flattenTree(children, depth + 1, expandedIds));
    }
  }
  return result;
}

/** Check if any node in the subtree matches the search query. */
function treeMatchesSearch(node: OrganizationUnit, query: string): boolean {
  if (node.name.toLowerCase().includes(query)) return true;
  if (node.type?.name?.toLowerCase().includes(query)) return true;
  for (const child of node.children ?? []) {
    if (treeMatchesSearch(child, query)) return true;
  }
  return false;
}

/** Filter tree to only nodes (and their ancestors) that match the search. */
function filterTree(nodes: OrganizationUnit[], query: string): OrganizationUnit[] {
  if (!query) return nodes;
  return nodes
    .filter((node) => treeMatchesSearch(node, query))
    .map((node) => ({
      ...node,
      children: filterTree(node.children ?? [], query),
    }));
}

/** Collect all node IDs in a tree (used to expand all when searching). */
function collectAllIds(nodes: OrganizationUnit[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    ids.push(...collectAllIds(node.children ?? []));
  }
  return ids;
}

// ─── Check state helpers ────────────────────────────────────────────────────────

type CheckState = "checked" | "unchecked" | "indeterminate";

function getCheckState(node: OrganizationUnit, selected: Set<string>): CheckState {
  const allIds = collectIds(node);
  const selectedCount = allIds.filter((id) => selected.has(id)).length;
  if (selectedCount === 0) return "unchecked";
  if (selectedCount === allIds.length) return "checked";
  return "indeterminate";
}

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface OrgUnitTreeSelectProps {
  /** The full org tree from the API. */
  tree: OrganizationUnit[];
  /** Currently selected org unit IDs. */
  selectedIds: Set<string>;
  /** Called when selection changes. */
  onSelectionChange: (ids: Set<string>) => void;
  /** Placeholder text for the search input. */
  placeholder?: string;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * Searchable multi-select combobox that displays an org unit hierarchy
 * as an indented tree with checkboxes.
 *
 * The search input IS the trigger — focus or type to open the dropdown.
 * No extra click required.
 */
export function OrgUnitTreeSelect({
  tree,
  selectedIds,
  onSelectionChange,
  placeholder = "Search org units...",
  className,
}: OrgUnitTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const query = search.toLowerCase().trim();

  // Filter + expand when searching
  const visibleTree = useMemo(() => filterTree(tree, query), [tree, query]);
  const effectiveExpanded = useMemo(() => {
    if (query) return new Set(collectAllIds(visibleTree));
    return expandedIds;
  }, [query, visibleTree, expandedIds]);

  const flatNodes = useMemo(
    () => flattenTree(visibleTree, 0, effectiveExpanded),
    [visibleTree, effectiveExpanded],
  );

  // ── Toggle expand ───────────────────────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Toggle selection (with cascading) ───────────────────────────────────
  const toggleSelect = useCallback(
    (node: OrganizationUnit) => {
      const allIds = collectIds(node);
      const state = getCheckState(node, selectedIds);
      const next = new Set(selectedIds);

      if (state === "checked") {
        for (const id of allIds) next.delete(id);
      } else {
        for (const id of allIds) next.add(id);
      }

      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  // ── Clear all ───────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  const selectedCount = selectedIds.size;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {/* Search input (the trigger) — M3 Search Bar */}
      <SearchBar
        aria-label="Search"
        value={search}
        onChange={(v: string) => { setSearch(v); if (!open) setOpen(true); }}
        placeholder={placeholder}
        className="mx-0 min-w-0 w-full"
        trailingIcon={
          (search || selectedCount > 0) ? (
            <button
              type="button"
              onClick={() => { setSearch(""); if (selectedCount > 0) clearAll(); }}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-on-surface/8 transition-colors"
            >
              <Icon name="close" size={20} className="text-on-surface-variant" />
            </button>
          ) : undefined
        }
      />

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-80 max-w-120 rounded-xl bg-surface-container border border-outline-variant shadow-lg overflow-hidden">
          {/* Tree list */}
          <div className="max-h-80 overflow-y-auto py-1">
            {flatNodes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Icon name="search_off" size={24} className="text-on-surface-variant/40 mb-2" />
                <p className="text-[13px] text-on-surface-variant">No org units found</p>
              </div>
            ) : (
              flatNodes.map(({ node, depth, hasChildren }) => {
                const state = getCheckState(node, selectedIds);
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-on-surface/4 transition-colors cursor-pointer"
                    style={{ paddingLeft: `${12 + depth * 20}px` }}
                    onClick={() => toggleSelect(node)}
                  >
                    {/* Expand/collapse toggle */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(node.id);
                        }}
                        className="shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-on-surface/8"
                      >
                        <Icon
                          name={effectiveExpanded.has(node.id) ? "expand_more" : "chevron_right"}
                          size={16}
                          className="text-on-surface-variant"
                        />
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}

                    {/* Checkbox */}
                    <Checkbox aria-label="Toggle"
 checked={state === "checked"}
                      indeterminate={state === "indeterminate"}
                      onCheckedChange={() => toggleSelect(node)}
                      className="shrink-0"
                    />

                    {/* Label */}
                    <span className="flex-1 text-[13px] text-on-surface truncate min-w-0">
                      {node.name}
                    </span>

                    {/* Type badge */}
                    {node.type?.name && (
                      <span className="text-[10px] text-on-surface-variant/60 shrink-0">
                        {node.type.name}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selectedCount > 0 && (
            <div className="px-3 py-2 border-t border-outline-variant flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">
                {(() => {
                  // Build summary by type name
                  const typeCounts = new Map<string, number>();
                  const countSelected = (nodes: OrganizationUnit[]) => {
                    for (const node of nodes) {
                      if (selectedIds.has(node.id)) {
                        const typeName = node.type?.name ?? "Unit";
                        typeCounts.set(typeName, (typeCounts.get(typeName) ?? 0) + 1);
                      }
                      countSelected(node.children ?? []);
                    }
                  };
                  countSelected(tree);
                  return Array.from(typeCounts.entries())
                    .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
                    .join(" · ");
                })()}
              </span>
              <Button variant="text" size="xs" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
