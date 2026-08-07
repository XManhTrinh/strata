"use client";

import { useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { useTribes, useClusters, useSquads } from "@/services";

export default function EngineeringPage() {
  const [expandedTribes, setExpandedTribes] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [selectedTribeId, setSelectedTribeId] = useState<string>("");
  const [selectedClusterId, setSelectedClusterId] = useState<string>("");

  const {
    data: tribes,
    isLoading: tribesLoading,
    isError: tribesError,
    error: tribesErr,
    refetch: refetchTribes,
  } = useTribes();

  const {
    data: clusters,
    isLoading: clustersLoading,
  } = useClusters(selectedTribeId);

  const {
    data: squads,
    isLoading: squadsLoading,
  } = useSquads(selectedClusterId);

  const toggleTribe = (id: string) => {
    setExpandedTribes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setSelectedTribeId(id);
      }
      return next;
    });
  };

  const toggleCluster = (id: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setSelectedClusterId(id);
      }
      return next;
    });
  };

  if (tribesError) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
            <p className="text-xs text-muted-foreground">
              Tribes, Clusters, and Squads hierarchy.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {tribesErr?.message || "Failed to load engineering data"}
          </p>
          <button
            type="button"
            onClick={() => refetchTribes()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tribesLoading) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
            <p className="text-xs text-muted-foreground">
              Tribes, Clusters, and Squads hierarchy.
            </p>
          </div>
        </AppBar>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-md border border-border bg-card p-4"
            >
              <div className="h-5 w-48 rounded bg-muted mb-2" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
          <p className="text-xs text-muted-foreground">
            Tribes, Clusters, and Squads hierarchy.
          </p>
        </div>
      </AppBar>

      <div className="space-y-3">
        {(tribes ?? []).map((tribe) => (
          <div key={tribe.id} className="rounded-md border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleTribe(tribe.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              aria-expanded={expandedTribes.has(tribe.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm" aria-hidden="true">
                  {expandedTribes.has(tribe.id) ? "▼" : "▶"}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {tribe.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tribe.clusters?.length ?? 0} clusters
              </span>
            </button>

            {expandedTribes.has(tribe.id) && (
              <div className="border-t border-border pl-6 pb-2">
                {clustersLoading && selectedTribeId === tribe.id ? (
                  <div className="animate-pulse p-3">
                    <div className="h-4 w-36 rounded bg-muted mb-2" />
                    <div className="h-4 w-36 rounded bg-muted" />
                  </div>
                ) : (
                  (selectedTribeId === tribe.id ? clusters : tribe.clusters ?? [])?.map(
                    (cluster) => (
                      <div key={cluster.id} className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleCluster(cluster.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left rounded-md hover:bg-muted/30 transition-colors"
                          aria-expanded={expandedClusters.has(cluster.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs" aria-hidden="true">
                              {expandedClusters.has(cluster.id) ? "▼" : "▶"}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {cluster.name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {cluster.squads?.length ?? 0} squads
                          </span>
                        </button>

                        {expandedClusters.has(cluster.id) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {squadsLoading && selectedClusterId === cluster.id ? (
                              <div className="animate-pulse p-2">
                                <div className="h-4 w-28 rounded bg-muted mb-1" />
                                <div className="h-4 w-28 rounded bg-muted" />
                              </div>
                            ) : (
                              (selectedClusterId === cluster.id
                                ? squads
                                : cluster.squads ?? []
                              )?.map((squad) => (
                                <div
                                  key={squad.id}
                                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors"
                                >
                                  <span className="text-sm text-foreground">
                                    {squad.name}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            )}
          </div>
        ))}
        {(tribes ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground text-center p-8">
            No tribes found
          </div>
        )}
      </div>
    </div>
  );
}
