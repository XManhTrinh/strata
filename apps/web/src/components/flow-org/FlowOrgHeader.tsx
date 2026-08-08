"use client";

import { useState, useRef, useEffect } from "react";
import { OrgChartViewMode } from "@/lib/org-tree/types";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@strata/mui";
import { Chip } from "@strata/mui";
import { Search } from "@strata/mui";
import type { OrganizationUnit } from "@/services";

interface FlowOrgHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedSquads: Set<string>;
  onToggleSquad: (squad: string) => void;
  onClearSquads: () => void;
  squadCounts: Record<string, number>;
  totalCount: number;
  /** Real org units from the API */
  orgUnits: OrganizationUnit[];
  viewMode: OrgChartViewMode;
  onViewModeChange: (mode: OrgChartViewMode) => void;
  searchResultCount?: number;
  pathToRoot?: string[];
  exportButton?: React.ReactNode;
}

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
  exportButton,
}: FlowOrgHeaderProps) {
  const isAllView = selectedSquads.size === 0;
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [filterOpen]);

  // Group org units by type name
  const groupedUnits = orgUnits.reduce<Record<string, OrganizationUnit[]>>((acc, unit) => {
    const typeName = unit.type?.name ?? "Other";
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(unit);
    return acc;
  }, {});

  // Filter by search
  const matchesFilter = (unit: OrganizationUnit) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (
      unit.name.toLowerCase().includes(q) ||
      (unit.type?.name ?? "").toLowerCase().includes(q)
    );
  };

  return (
    <div className="shrink-0 z-10">
      <AppBar className="justify-between gap-4">
        <h1 className="text-[22px] leading-7 font-normal text-foreground shrink-0">
          Org Chart
        </h1>

        {/* View mode toggle */}
        <div className="flex items-center bg-surface-variant rounded-full p-1 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("reporting")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              viewMode === "reporting"
                ? "bg-secondary-container text-secondary-container-foreground"
                : "text-surface-variant-foreground hover:text-foreground"
            }`}
          >
            Reporting
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("department")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              viewMode === "department"
                ? "bg-secondary-container text-secondary-container-foreground"
                : "text-surface-variant-foreground hover:text-foreground"
            }`}
          >
            Departments
          </button>
        </div>

        {/* Search */}
        <Search
          className="flex-1 max-w-xs"
          value={search}
          onValueChange={onSearchChange}
          placeholder="Search name, title, dept..."
        />

        {/* Search result count */}
        {search.trim() && searchResultCount !== undefined && (
          <span className="text-[12px] text-muted-foreground shrink-0">
            {searchResultCount} {searchResultCount === 1 ? "result" : "results"}
          </span>
        )}

        {/* Export */}
        {exportButton}
      </AppBar>

      {/* Filter bar: squad selector + selected chips */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-outline-variant min-h-12">
        {/* Team filter dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${
              isAllView
                ? "border-outline-variant text-foreground hover:bg-surface-foreground/8"
                : "border-primary bg-primary/8 text-primary"
            }`}
          >
            <Icon name="filter_list" size={18} />
            {isAllView ? `All teams (${totalCount})` : `${selectedSquads.size} selected`}
            <Icon name={filterOpen ? "expand_less" : "expand_more"} size={18} />
          </button>

          {filterOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-[hsl(var(--surface))] shadow-xl border border-outline-variant/50 z-50 overflow-hidden">
              {/* Dropdown search */}
              <div className="p-3 border-b border-outline-variant/50">
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Quick actions */}
              <div className="px-3 py-2 flex items-center justify-between border-b border-outline-variant/50">
                <button
                  type="button"
                  onClick={onClearSquads}
                  className="text-[12px] text-primary font-medium hover:underline"
                >
                  Clear all
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {selectedSquads.size} of {orgUnits.length} selected
                </span>
              </div>

              {/* Org units list grouped by type */}
              <div className="max-h-64 overflow-y-auto py-1">
                {Object.entries(groupedUnits).map(([typeName, units]) => {
                  const filtered = units.filter(matchesFilter);
                  if (filtered.length === 0) return null;

                  return (
                    <div key={typeName}>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {typeName}
                      </p>
                      {filtered.map((unit) => {
                        const isSelected = selectedSquads.has(unit.name);
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => onToggleSquad(unit.name)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                              isSelected
                                ? "bg-primary/8 text-primary font-medium"
                                : "text-foreground hover:bg-surface-foreground/8"
                            }`}
                          >
                            <Icon
                              name={isSelected ? "check_box" : "check_box_outline_blank"}
                              size={20}
                              className={isSelected ? "text-primary" : "text-muted-foreground"}
                            />
                            <span className="flex-1 text-left">{unit.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {squadCounts[unit.name] ?? 0}
                            </span>
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

        {/* Selected squad chips */}
        {!isAllView && (
          <div className="flex items-center gap-1.5 flex-wrap">
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
            <button
              type="button"
              onClick={onClearSquads}
              className="text-[12px] text-primary font-medium hover:underline ml-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Path to root breadcrumb */}
      {pathToRoot && pathToRoot.length > 0 && (
        <div className="px-6 py-2 border-b border-outline-variant">
          <div className="text-[12px] text-muted-foreground flex items-center gap-1 flex-wrap">
            <Icon name="route" size={18} className="text-primary mr-1" />
            {pathToRoot.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <Icon name="chevron_right" size={18} className="text-muted-foreground" />}
                <span className={i === pathToRoot.length - 1 ? "font-medium text-primary" : ""}>
                  {name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
