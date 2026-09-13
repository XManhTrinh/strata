"use client";

import { motion } from "motion/react";
import {
  PageBar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  List,
  ListItem,
  Divider,
  Chip,
  Typography,
} from "@vkieu/mui";
import { usePeople, useLeaveRequests, useCalendarEvents } from "@/services";
import { Button } from "@vkieu/mui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";


interface StatCardData {
  icon: string;
  value: string | number;
  label: string;
  tint: string;
  iconColor: string;
}

/* ─── Loading Skeletons ────────────────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-3 p-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="px-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────────── */

function DashboardStatCard({ icon, value, label, tint, iconColor }: StatCardData) {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-3 p-6">
        <div
          className={`flex items-center justify-center h-10 w-10 rounded-full ${tint}`}
        >
          <Icon name={icon} size={20} className={iconColor} />
        </div>
        <div>
          <Typography variant="headline-large">
            {value}
          </Typography>
          <Typography variant="body-medium" color="surface-variant-foreground" className="mt-1">
            {label}
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const companyId = useCompanyId();
  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesErr,
    refetch: refetchEmployees,
  } = usePeople({ companyId, page: 1, pageSize: 1 });

  const {
    data: leaveData,
    isLoading: leaveLoading,
    isError: leaveError,
    error: leaveErr,
    refetch: refetchLeave,
  } = useLeaveRequests(companyId);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErr,
    refetch: refetchEvents,
  } = useCalendarEvents(companyId, {
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
      label: "Total members",
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

  /* ─── Error State ──────────────────────────────────────────────────────── */

  if (hasError) {
    return (
      <div className="flex flex-col gap-6">
        <PageBar>
          <div>
            <Typography variant="headline-medium">
              Dashboard
            </Typography>
          </div>
        </PageBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <Typography variant="title-medium" className="mb-2">
              Something went wrong
            </Typography>
            <Typography variant="body-medium" color="surface-variant-foreground" className="mb-6">
              {employeesErr?.message ||
                leaveErr?.message ||
                eventsErr?.message ||
                "Failed to load dashboard data. Please try again."}
            </Typography>
            <Button
              variant="filled"
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

  /* ─── Main Dashboard ───────────────────────────────────────────────────── */

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <PageBar>
        <div className="flex flex-col gap-1">
          <Typography variant="headline-medium">
            Dashboard
          </Typography>
          <Typography variant="body-medium" color="surface-variant-foreground">
            Overview of your organization&apos;s key metrics
          </Typography>
        </div>
      </PageBar>

      {/* ─── KPI Stats Grid ──────────────────────────────────────────────── */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            : stats.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} />
              ))}
        </div>
      </section>

      <Divider />

      {/* ─── Content Grid: Activity + Quick Actions ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── Recent Activity / Upcoming Events ─────────────────────────── */}
        <section className="lg:col-span-2" aria-label="Upcoming events">
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[16px] leading-6 font-medium text-surface-foreground">
                Upcoming Events
              </CardTitle>
              <Chip variant="assist" leadingIcon="calendar_month">
                Next 30 days
              </Chip>
            </CardHeader>
            <CardContent className="px-0 pt-0 pb-2">
              {isLoading ? (
                <ActivitySkeleton />
              ) : (eventsData ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-variant mb-3">
                    <Icon
                      name="event_available"
                      size={24}
                      className="text-surface-variant-foreground"
                    />
                  </div>
                  <Typography variant="title-medium" className="mb-1">
                    All clear
                  </Typography>
                  <Typography variant="body-medium" color="surface-variant-foreground">
                    No upcoming events in the next 30 days
                  </Typography>
                </div>
              ) : (
                <List>
                  {(eventsData ?? []).slice(0, 5).map((event) => (
                    <ListItem
                      key={event.id}
                      lines={2}
                      leading={
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/12">
                          <Icon
                            name="calendar_today"
                            size={20}
                            className="text-primary"
                          />
                        </div>
                      }
                      supporting={new Date(
                        event.startDate
                      ).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      trailing={
                        <Chip
                          variant="assist"
                          leadingIcon={event.allDay ? "sunny" : "schedule"}
                        >
                          {event.allDay ? "All day" : "Timed"}
                        </Chip>
                      }
                    >
                      {event.title}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ─── Quick Actions ─────────────────────────────────────────────── */}
        <section aria-label="Quick actions">
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="text-[16px] leading-6 font-medium text-surface-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Button variant="tonal" className="w-full justify-start gap-3">
                <Icon name="person_add" size={20} />
                Add Member
              </Button>
              <Button variant="tonal" className="w-full justify-start gap-3">
                <Icon name="account_tree" size={20} />
                View Org Chart
              </Button>
              <Button variant="tonal" className="w-full justify-start gap-3">
                <Icon name="event_available" size={20} />
                Submit Leave
              </Button>
              <Button variant="tonal" className="w-full justify-start gap-3">
                <Icon name="description" size={20} />
                Generate Report
              </Button>

              <Divider className="my-2" />

              <Button variant="filled" className="w-full justify-start gap-3">
                <Icon name="add" size={20} />
                New Request
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </motion.div>
  );
}
