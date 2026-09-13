"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { OrgChartViewMode } from "@/lib/org-tree/types";
import {
  PageBar,
  Icon,
  Chip,
  Search,
  Typography,
  Checkbox,
  Divider,
} from "@vkieu/mui";
import { Button, IconButton } from "@vkieu/mui/buttons";
import type { OrganizationUnit } from "@/services";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FlowOrgHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedSquads: Set<string>;
  onToggleSquad: (squad: string) => void;
  onClearSquads: () => void;
  squadCounts: Record<string, number>;
  totalCount: number;
  orgUnits: OrganizationUnit[];
  viewMode: OrgChartViewMode;
  onViewModeChange: (mode: OrgChartViewMode) => void;
  searchResultCount?: number;
  pathToRoot?: string[];
  /** Status text for filter/search (rendered below the toolbar) */
  statusText?: React.ReactNode;
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────

function TeamFilterDropdown({
  orgUnits,
  selectedSquads,
  onToggleSquad,
  onClearSquads,
  squadCounts,
  totalCount,
}: {
  orgUnits: OrganizationUnit[];
  selectedSquads: Set<string>;
  onToggleSquad: (squad: string) => void;
  onClearSquads: () => void;
  squadCounts: Record<string, number>;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isAllView = selectedSquads.size === 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const grouped = orgUnits.reduce<Record<string, OrganizationUnit[]>>((acc, u) => {
    const type = u.type?.name ?? "Other";
    (acc[type] ??= []).push(u);
    return acc;
  }, {});

  const matchesFilter = (u: OrganizationUnit) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.type?.name ?? "").toLowerCase().includes(q);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={isAllView ? "outlined" : "tonal"}
        size="xs"
        onClick={() => setOpen(!open)}
      >
        <Icon name="filter_list" size={18} />
        {isAllView ? `All teams (${totalCount})` : `${selectedSquads.size} selected`}
        <Icon name={open ? "expand_less" : "expand_more"} size={18} />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-surface shadow-xl border border-outline-variant/50 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-outline-variant/50">
            <Search
              value={filterSearch}
              onValueChange={setFilterSearch}
              placeholder="Search teams..."
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-outline-variant/50">
            <Button variant="text" size="xs" onClick={onClearSquads}>
              Clear all
            </Button>
            <Typography variant="label-small" color="surface-variant-foreground">
              {selectedSquads.size} of {orgUnits.length}
            </Typography>
          </div>

          {/* Grouped list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {Object.entries(grouped).map(([typeName, units]) => {
              const filtered = units.filter(matchesFilter);
              if (filtered.length === 0) return null;
              return (
                <div key={typeName}>
                  <Typography variant="label-small" color="surface-variant-foreground" className="px-4 pt-3 pb-1 uppercase tracking-wider">
                    {typeName}
                  </Typography>
                  {filtered.map((unit) => {
                    const isSelected = selectedSquads.has(unit.name);
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => onToggleSquad(unit.name)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          isSelected
                            ? "bg-primary/8 text-primary font-medium"
                            : "text-surface-foreground hover:bg-surface-foreground/8"
                        }`}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSquad(unit.name)} />
                        <span className="flex-1 text-left">{unit.name}</span>
                        <Typography variant="label-small" color="surface-variant-foreground" as="span">
                          {squadCounts[unit.name] ?? 0}
                        </Typography>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function FlowOrgHeader({
  search,
  onSearchChange,
  selectedSquads,
  onToggleSquad,
  onClearSquads,
  squadCounts,
  totalCount,
  orgUnits,
  viewMode,
  onViewModeChange,
  searchResultCount,
  pathToRoot,
  statusText,
}: FlowOrgHeaderProps) {
  const isAllView = selectedSquads.size === 0;

  return (
    <div className="shrink-0 z-10">
      {/* ── Main toolbar ───────────────────────────────────────────────── */}
      <PageBar className="justify-between gap-4">
        {/* Left: title + view toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <Typography variant="title-large">Org Chart</Typography>

          {/* Segmented toggle */}
          <div className="flex items-center bg-surface-container-highest/50 rounded-full p-1">
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

        {/* Center: search */}
        <Search
          className="flex-1 max-w-xs"
          value={search}
          onValueChange={onSearchChange}
          placeholder="Search name, title, dept..."
        />

        {/* Right: filter + count */}
        <div className="flex items-center gap-3 shrink-0">
          {search.trim() && searchResultCount !== undefined && (
            <Chip variant="filter" selected>
              {searchResultCount} {searchResultCount === 1 ? "result" : "results"}
            </Chip>
          )}

          <TeamFilterDropdown
            orgUnits={orgUnits}
            selectedSquads={selectedSquads}
            onToggleSquad={onToggleSquad}
            onClearSquads={onClearSquads}
            squadCounts={squadCounts}
            totalCount={totalCount}
          />
        </div>
      </PageBar>

      {/* ── Filter chips + status + path ───────────────────────────────── */}
      {(!isAllView || statusText || (pathToRoot && pathToRoot.length > 0)) && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-outline-variant flex-wrap min-h-10">
          {/* Selected team chips */}
          {!isAllView && (
            <>
              {Array.from(selectedSquads).map((squad) => (
                <Chip
                  key={squad}
                  variant="filter"
                  selected
                  trailingIcon="close"
                  onClick={() => onToggleSquad(squad)}
                >
                  {squad}
                </Chip>
              ))}
              <Button variant="text" size="xs" onClick={onClearSquads}>
                Clear
              </Button>
            </>
          )}

          {/* Status text (filter count, search feedback) */}
          {statusText}

          {/* Path to root */}
          {pathToRoot && pathToRoot.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Icon name="route" size={16} className="text-primary" />
              {pathToRoot.map((name, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <Icon name="chevron_right" size={16} className="text-outline" />}
                  <Typography
                    variant="label-small"
                    as="span"
                    color={i === pathToRoot.length - 1 ? "primary" : "surface-variant-foreground"}
                    className={i === pathToRoot.length - 1 ? "font-medium" : ""}
                  >
                    {name}
                  </Typography>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
