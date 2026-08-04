"use client";

import { ProgressBar } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface TeamMemberCapacity {
  id: string;
  name: string;
  squad: string;
  allocation: number;
}

const mockCapacity: TeamMemberCapacity[] = [
  { id: "1", name: "Sarah Chen", squad: "Frontend Squad", allocation: 85 },
  { id: "2", name: "Marcus Johnson", squad: "API Squad", allocation: 60 },
  { id: "3", name: "Emily Rodriguez", squad: "Cloud Squad", allocation: 95 },
  { id: "4", name: "David Park", squad: "Frontend Squad", allocation: 40 },
  { id: "5", name: "Aisha Patel", squad: "Data Engineering Squad", allocation: 75 },
  { id: "6", name: "James Wilson", squad: "DevOps Squad", allocation: 100 },
  { id: "7", name: "Lin Zhang", squad: "Cloud Squad", allocation: 50 },
  { id: "8", name: "Olivia Thompson", squad: "Analytics Squad", allocation: 30 },
  { id: "9", name: "Carlos Mendez", squad: "Security Squad", allocation: 90 },
  { id: "10", name: "Priya Sharma", squad: "Mobile Squad", allocation: 70 },
];

export default function CapacityPage() {
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
          {mockCapacity.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground">{member.name}</span>
              <span className="text-sm text-muted-foreground">{member.squad}</span>
              <ProgressBar value={member.allocation} />
              <span
                className={`text-sm font-medium min-w-[3ch] text-right ${
                  member.allocation >= 90
                    ? "text-red-600 dark:text-red-400"
                    : member.allocation >= 70
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                {member.allocation}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
