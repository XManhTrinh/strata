"use client";

import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { useEmployees } from "@/services";
import { useLeaveRequests } from "@/services";
import { useCalendarEvents } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { List, ListItem } from "@/components/ui/list";
import { Divider } from "@/components/ui/divider";
import { Chip } from "@/components/ui/chips";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

const COMPANY_ID = "cm_acme_corp_001";

interface StatCardData {
  icon: string;
  value: string | number;
  label: string;
  tint: string;
  iconColor: string;
}

function StatCardSkeleton() {
  return (
    <Card variant="outlined">
      <CardContent className="flex items-center gap-4 p-6">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-9 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardStatCard({ icon, value, label, tint, iconColor }: StatCardData) {
  return (
    <Card variant="outlined">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex items-center justify-center h-12 w-12 rounded-2xl ${tint}`}>
          <Icon name={icon} size={24} className={iconColor} />
        </div>
        <div>
          <p className="text-[36px] leading-11 font-normal text-foreground">
            {value}
          </p>
          <p className="text-[14px] leading-5 text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const stats: StatCardData[] = [
    {
      icon: "group",
      value: headcount,
      label: "Total employees",
      tint: "bg-primary/12",
      iconColor: "text-primary",
    },
    {
      icon: "event_busy",
      value: pendingLeave,
      label: "Pending leave",
      tint: "bg-tertiary/12",
      iconColor: "text-tertiary",
    },
    {
      icon: "event",
      value: upcomingEvents,
      label: "Upcoming events",
      tint: "bg-secondary/12",
      iconColor: "text-secondary",
    },
    {
      icon: "corporate_fare",
      value: "—",
      label: "Tribes & squads",
      tint: "bg-primary/12",
      iconColor: "text-primary",
    },
  ];

  if (hasError) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">
              Dashboard
            </h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Overview of your organization&apos;s key metrics
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {employeesErr?.message ||
                leaveErr?.message ||
                eventsErr?.message ||
                "Failed to load dashboard data"}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                refetchEmployees();
                refetchLeave();
                refetchEvents();
              }}
            >
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar>
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">
            Dashboard
          </h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Overview of your organization&apos;s key metrics
          </p>
        </div>
      </AppBar>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : stats.map((stat) => (
              <DashboardStatCard key={stat.label} {...stat} />
            ))}
      </div>

      <Divider />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Upcoming Events */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[16px] leading-6 font-medium">
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            {isLoading ? (
              <div className="px-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-6 w-6 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (eventsData ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Icon
                  name="event_available"
                  size={40}
                  className="text-muted-foreground/40 mb-2"
                />
                <p className="text-[14px] leading-5 text-muted-foreground">
                  No upcoming events
                </p>
              </div>
            ) : (
              <List dividers>
                {(eventsData ?? []).slice(0, 5).map((event) => (
                  <ListItem
                    key={event.id}
                    lines={2}
                    headline={event.title}
                    supportingText={new Date(
                      event.startDate
                    ).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    leadingIcon="calendar_today"
                    trailingContent={
                      <Chip variant="assist" leadingIcon={event.allDay ? "sunny" : "schedule"}>
                        {event.allDay ? "All day" : "Timed"}
                      </Chip>
                    }
                    interactive={false}
                  />
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Right: Quick Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-[16px] leading-6 font-medium">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-start"
            >
              <Icon name="person_add" size={20} />
              Add Employee
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
            >
              <Icon name="account_tree" size={20} />
              View Org Chart
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
            >
              <Icon name="event_available" size={20} />
              Submit Leave
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
            >
              <Icon name="description" size={20} />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
