"use client";

import { useState } from "react";
import { AppBar } from "@/components/layout/app-bar";

interface Squad {
  id: string;
  name: string;
  memberCount: number;
}

interface Cluster {
  id: string;
  name: string;
  squads: Squad[];
}

interface Tribe {
  id: string;
  name: string;
  clusters: Cluster[];
}

const mockTribes: Tribe[] = [
  {
    id: "t1",
    name: "Platform Tribe",
    clusters: [
      {
        id: "c1",
        name: "Infrastructure Cluster",
        squads: [
          { id: "s1", name: "Cloud Squad", memberCount: 5 },
          { id: "s2", name: "DevOps Squad", memberCount: 4 },
          { id: "s3", name: "Security Squad", memberCount: 3 },
        ],
      },
      {
        id: "c2",
        name: "Data Cluster",
        squads: [
          { id: "s4", name: "Data Engineering Squad", memberCount: 6 },
          { id: "s5", name: "Analytics Squad", memberCount: 4 },
        ],
      },
    ],
  },
  {
    id: "t2",
    name: "Product Tribe",
    clusters: [
      {
        id: "c3",
        name: "Growth Cluster",
        squads: [
          { id: "s6", name: "Activation Squad", memberCount: 5 },
          { id: "s7", name: "Retention Squad", memberCount: 4 },
        ],
      },
      {
        id: "c4",
        name: "Experience Cluster",
        squads: [
          { id: "s8", name: "Frontend Squad", memberCount: 7 },
          { id: "s9", name: "Mobile Squad", memberCount: 5 },
        ],
      },
    ],
  },
  {
    id: "t3",
    name: "Enterprise Tribe",
    clusters: [
      {
        id: "c5",
        name: "Integration Cluster",
        squads: [
          { id: "s10", name: "API Squad", memberCount: 4 },
          { id: "s11", name: "Partner Squad", memberCount: 3 },
        ],
      },
    ],
  },
];

export default function EngineeringPage() {
  const [expandedTribes, setExpandedTribes] = useState<Set<string>>(new Set(["t1"]));
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set(["c1"]));

  const toggleTribe = (id: string) => {
    setExpandedTribes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCluster = (id: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        {mockTribes.map((tribe) => (
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
                <span className="text-sm font-semibold text-foreground">{tribe.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tribe.clusters.length} clusters
              </span>
            </button>

            {expandedTribes.has(tribe.id) && (
              <div className="border-t border-border pl-6 pb-2">
                {tribe.clusters.map((cluster) => (
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
                        <span className="text-sm font-medium text-foreground">{cluster.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {cluster.squads.length} squads
                      </span>
                    </button>

                    {expandedClusters.has(cluster.id) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {cluster.squads.map((squad) => (
                          <div
                            key={squad.id}
                            className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-sm text-foreground">{squad.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {squad.memberCount} members
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
