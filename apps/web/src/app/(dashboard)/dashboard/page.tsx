"use client";

import { StatCard } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

const recentActivity = [
  { id: 1, action: "New employee onboarded", user: "Sarah Chen", time: "2 minutes ago" },
  { id: 2, action: "Leave request approved", user: "Marcus Johnson", time: "15 minutes ago" },
  { id: 3, action: "Budget updated for Engineering", user: "Admin", time: "1 hour ago" },
  { id: 4, action: "Squad capacity reallocated", user: "David Park", time: "2 hours ago" },
  { id: 5, action: "Report generated: Q4 Headcount", user: "System", time: "3 hours ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Overview of your organization&apos;s key metrics.
          </p>
        </div>
      </AppBar>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Headcount"
          value={247}
          subtitle="+12 this quarter"
          trend="up"
          icon={<span aria-hidden="true">👥</span>}
        />
        <StatCard
          title="Capacity Utilization"
          value="84%"
          subtitle="Across all squads"
          trend="up"
          icon={<span aria-hidden="true">📊</span>}
        />
        <StatCard
          title="Pending Leave"
          value={8}
          subtitle="Awaiting approval"
          trend="neutral"
          icon={<span aria-hidden="true">📅</span>}
        />
        <StatCard
          title="Budget Variance"
          value="-2.3%"
          subtitle="Under budget"
          trend="down"
          icon={<span aria-hidden="true">💰</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <ul className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md p-3 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">by {item.user}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="mr-2" aria-hidden="true">➕</span>
              Add Employee
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="mr-2" aria-hidden="true">🏢</span>
              View Org Chart
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="mr-2" aria-hidden="true">📋</span>
              Submit Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
