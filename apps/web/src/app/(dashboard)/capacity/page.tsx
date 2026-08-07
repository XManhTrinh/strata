"use client";

import { ProgressBar } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useCapacityAllocations } from "@/services";

export default function CapacityPage() {
  const { data: allocations, isLoading, isError, error, refetch } =
    useCapacityAllocations();

  if (isError) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Capacity</h1>
            <p className="text-xs text-muted-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load capacity data"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Capacity</h1>
            <p className="text-xs text-muted-foreground">
              Team member capacity allocation overview.
            </p>
          </div>
        </AppBar>
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-4 border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Name</span>
            <span className="text-sm font-medium text-muted-foreground">Squad</span>
            <span className="text-sm font-medium text-muted-foreground">Allocation</span>
            <span className="text-sm font-medium text-muted-foreground">%</span>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 px-4 py-3"
              >
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-8 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Capacity</h1>
          <p className="text-xs text-muted-foreground">
            Team member capacity allocation overview.
          </p>
        </div>
      </AppBar>

      <div className="rounded-md border border-border bg-card">
        <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-4 border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Name</span>
          <span className="text-sm font-medium text-muted-foreground">Squad</span>
          <span className="text-sm font-medium text-muted-foreground">Allocation</span>
          <span className="text-sm font-medium text-muted-foreground">%</span>
        </div>
        <div className="divide-y divide-border">
          {(allocations ?? []).map((alloc) => (
            <div
              key={alloc.id}
              className="grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">
                {alloc.employee?.person?.fullName ?? alloc.employeeId}
              </span>
              <span className="text-sm text-muted-foreground">
                {alloc.squad?.name ?? alloc.squadId}
              </span>
              <ProgressBar value={alloc.percentage} />
              <span
                className={`text-sm font-medium min-w-[3ch] text-right ${
                  alloc.percentage >= 90
                    ? "text-red-600 dark:text-red-400"
                    : alloc.percentage >= 70
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                {alloc.percentage}%
              </span>
            </div>
          ))}
          {(allocations ?? []).length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No capacity allocations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
