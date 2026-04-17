"use client";

interface FlowOrgHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddPerson: () => void;
  selectedSquads: Set<string>;
  onToggleSquad: (squad: string) => void;
  onClearSquads: () => void;
  squadCounts: Record<string, number>;
  totalCount: number;
  allSquadNames: string[];
}

export default function FlowOrgHeader({
  search,
  onSearchChange,
  onAddPerson,
  selectedSquads,
  onToggleSquad,
  onClearSquads,
  squadCounts,
  totalCount,
  allSquadNames,
}: FlowOrgHeaderProps) {
  const isAllView = selectedSquads.size === 0;

  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shrink-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 shrink-0">Org Flow</h1>

        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {search && (
            <button type="button" onClick={() => onSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onAddPerson}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          + Add Person
        </button>
      </div>

      <div className="px-6 flex items-center gap-1 overflow-x-auto pb-px scrollbar-hide">
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
          <span className={["ml-1.5 text-xs px-1.5 py-0.5 rounded-full", isAllView ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"].join(" ")}>
            {totalCount}
          </span>
        </button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

        {allSquadNames.map((squad) => {
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
              <span className={["ml-1.5 text-xs px-1.5 py-0.5 rounded-full", active ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"].join(" ")}>
                {squadCounts[squad]}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
