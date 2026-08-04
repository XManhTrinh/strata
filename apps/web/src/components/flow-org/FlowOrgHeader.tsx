"use client";

import { Tribe } from "@/lib/org-tree/squads";
import { OrgChartViewMode } from "@/lib/org-tree/types";
import { AppBar } from "@/components/layout/app-bar";

interface FlowOrgHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedSquads: Set<string>;
  onToggleSquad: (squad: string) => void;
  onClearSquads: () => void;
  squadCounts: Record<string, number>;
  totalCount: number;
  tribes: Tribe[];
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
  tribes,
  viewMode,
  onViewModeChange,
  searchResultCount,
  pathToRoot,
  exportButton,
}: FlowOrgHeaderProps) {
  const isAllView = selectedSquads.size === 0;

  return (
    <div className="shrink-0 z-10">
      <AppBar className="justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 shrink-0">
          Org Chart
        </h1>

        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("reporting")}
            className={[
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              viewMode === "reporting"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            ].join(" ")}
          >
            Reporting Lines
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("department")}
            className={[
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              viewMode === "department"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            ].join(" ")}
          >
            Department Structure
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, title, dept, status..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Search result count */}
        {search.trim() && searchResultCount !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {searchResultCount} {searchResultCount === 1 ? "result" : "results"}
          </span>
        )}

        {/* Export */}
        {exportButton}
      </AppBar>

      {/* Path to root breadcrumb */}
      {pathToRoot && pathToRoot.length > 0 && (
        <div className="px-6 py-2 border-b border-border">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-wrap">
            <span className="font-medium text-gray-600 dark:text-gray-300">Path:</span>
            {pathToRoot.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-300 dark:text-gray-600">→</span>}
                <span className={i === pathToRoot.length - 1 ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}>
                  {name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Squad tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        <button
          type="button"
          onClick={onClearSquads}
          className={[
            "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            isAllView
              ? "border-blue-600 text-blue-500"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600",
          ].join(" ")}
        >
          All
          <span
            className={[
              "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
              isAllView
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
            ].join(" ")}
          >
            {totalCount}
          </span>
        </button>

        {tribes.map((tribe) => (
          <div key={tribe.name} className="flex items-center gap-1 shrink-0">
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
              {tribe.name}
            </span>
            {tribe.squads.map((squad) => {
              const active = selectedSquads.has(squad);
              return (
                <button
                  key={squad}
                  type="button"
                  onClick={() => onToggleSquad(squad)}
                  className={[
                    "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-indigo-600 text-indigo-500"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600",
                  ].join(" ")}
                >
                  {squad}
                  <span
                    className={[
                      "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                      active
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                    ].join(" ")}
                  >
                    {squadCounts[squad] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
