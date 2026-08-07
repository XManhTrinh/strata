"use client";

import { StatCard } from "@strata/ui";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees } from "@/services";
import { useLeaveRequests } from "@/services";
import { useCalendarEvents } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
        <Card variant="filled" className="flex flex-col items-center justify-center p-8">
          <CardContent className="flex flex-col items-center pt-6">
            <p className="text-sm text-destructive mb-4">
              {employeesErr?.message || leaveErr?.message || eventsErr?.message || "Failed to load dashboard data"}
            </p>
            <Button
              onClick={() => {
                refetchEmployees();
                refetchLeave();
                refetchEvents();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
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
            <Card key={i} variant="elevated">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Headcount"
            value={headcount}
            subtitle="Total employees"
            trend="up"
            icon={<Icon name="group" size={24} />}
          />
          <StatCard
            title="Pending Leave"
            value={pendingLeave}
            subtitle="Awaiting approval"
            trend="neutral"
            icon={<Icon name="event_busy" size={24} />}
          />
          <StatCard
            title="Upcoming Events"
            value={upcomingEvents}
            subtitle="Next 30 days"
            trend="neutral"
            icon={<Icon name="event" size={24} />}
          />
          <StatCard
            title="Active Teams"
            value="—"
            subtitle="Tribes & squads"
            trend="neutral"
            icon={<Icon name="corporate_fare" size={24} />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md p-3">
                    <div>
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start px-4 py-3 h-auto text-sm font-medium"
            >
              <Icon name="person_add" size={20} className="mr-2" />
              Add Employee
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start px-4 py-3 h-auto text-sm font-medium"
            >
              <Icon name="account_tree" size={20} className="mr-2" />
              View Org Chart
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start px-4 py-3 h-auto text-sm font-medium"
            >
              <Icon name="event_available" size={20} className="mr-2" />
              Submit Leave
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
