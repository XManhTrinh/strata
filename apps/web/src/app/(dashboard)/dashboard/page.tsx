"use client";

import { StatCard } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees } from "@/services";
import { useLeaveRequests } from "@/services";
import { useCalendarEvents } from "@/services";

const COMPANY_ID = "cm_acme_corp_001";

export default function DashboardPage() {
  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesErr,
    refetch: refetchEmployees,
  } = useEmployees({ page: 1, limit: 1 });

  const {
    data: leaveData,
    isLoading: leaveLoading,
    isError: leaveError,
    error: leaveErr,
    refetch: refetchLeave,
  } = useLeaveRequests(COMPANY_ID);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErr,
    refetch: refetchEvents,
  } = useCalendarEvents(COMPANY_ID, {
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  const isLoading = employeesLoading || leaveLoading || eventsLoading;
  const hasError = employeesError || leaveError || eventsError;

  const headcount = employeesData?.total ?? 0;
  const pendingLeave =
    leaveData?.filter((r) => r.status === "PENDING").length ?? 0;
  const upcomingEvents = eventsData?.length ?? 0;

  if (hasError) {
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
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {employeesErr?.message || leaveErr?.message || eventsErr?.message || "Failed to load dashboard data"}
          </p>
          <button
            type="button"
            onClick={() => {
              refetchEmployees();
              refetchLeave();
              refetchEvents();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-md border border-border bg-card p-6"
            >
              <div className="h-4 w-24 rounded bg-muted mb-3" />
              <div className="h-8 w-16 rounded bg-muted mb-2" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Headcount"
            value={headcount}
            subtitle="Total employees"
            trend="up"
            icon={<span aria-hidden="true">👥</span>}
          />
          <StatCard
            title="Pending Leave"
            value={pendingLeave}
            subtitle="Awaiting approval"
            trend="neutral"
            icon={<span aria-hidden="true">📅</span>}
          />
          <StatCard
            title="Upcoming Events"
            value={upcomingEvents}
            subtitle="Next 30 days"
            trend="neutral"
            icon={<span aria-hidden="true">📊</span>}
          />
          <StatCard
            title="Active Teams"
            value="—"
            subtitle="Tribes & squads"
            trend="neutral"
            icon={<span aria-hidden="true">🏢</span>}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Upcoming Events
          </h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between rounded-md p-3">
                  <div>
                    <div className="h-4 w-48 rounded bg-muted mb-1" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {(eventsData ?? []).slice(0, 5).map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between rounded-md p-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {event.allDay ? "All day" : "Timed"}
                  </span>
                </li>
              ))}
              {(eventsData ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground p-3">
                  No upcoming events
                </li>
              )}
            </ul>
          )}
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
