"use client";

import { motion } from "motion/react";
import {
  TopAppBar,
  Card,
  List,
  ListItem,
  Divider,
  AssistChip,
  Button,
} from "@vkieu/windmorph";
import { usePeople, useLeaveRequests, useCalendarEvents } from "@/services";
import { Icon } from "@/components/ui/icon";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card-content";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";


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
        <SkeletonGroup label="Loading stats">
          <Skeleton className="h-10 w-10" corner="full" />
          <div className="space-y-2">
            <Skeleton className="h-11 w-24" corner="extra-small" />
            <Skeleton className="h-4 w-28" corner="extra-small" />
          </div>
        </SkeletonGroup>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="px-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonGroup key={i} label="Loading activity">
          <div className="flex items-center gap-4 py-3">
            <Skeleton className="h-10 w-10" corner="full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-44" corner="extra-small" />
              <Skeleton className="h-3.5 w-28" corner="extra-small" />
            </div>
            <Skeleton className="h-6 w-16" corner="full" />
          </div>
        </SkeletonGroup>
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
          <p className="font-brand text-display-small text-on-surface">{value}</p>
          <p className="mt-1 text-body-medium text-on-surface-variant">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const reduced = useReducedMotionContext();
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
        <TopAppBar title={<h1 className="text-headline-medium">Dashboard</h1>} />
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <p className="text-title-medium mb-2">Something went wrong</p>
            <p className="text-body-medium text-on-surface-variant mb-6">
              {employeesErr?.message ||
                leaveErr?.message ||
                eventsErr?.message ||
                "Failed to load dashboard data. Please try again."}
            </p>
            <Button
              variant="filled"
              leadingIcon={<Icon name="refresh" />}
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

  /* ─── Main Dashboard ───────────────────────────────────────────────────── */

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <TopAppBar
        title={<h1 className="text-headline-medium">Dashboard</h1>}
        subtitle="Overview of your organization's key metrics"
        actions={
          <Button variant="filled" leadingIcon={<Icon name="add" />}>
            New request
          </Button>
        }
      />

      {/* ─── KPI Stats Grid ──────────────────────────────────────────────── */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            : stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={resolveAnimationVariants(
                    pageTransitionVariants,
                    reduced
                  )}
                  initial="initial"
                  animate="enter"
                  transition={{
                    ...defaultTransition,
                    delay: reduced ? 0 : index * 0.05,
                  }}
                >
                  <DashboardStatCard {...stat} />
                </motion.div>
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
              <CardTitle className="text-title-medium">Upcoming Events</CardTitle>
              <AssistChip leadingIcon={<Icon name="calendar_month" />}>
                Next 30 days
              </AssistChip>
            </CardHeader>
            <CardContent className="px-0 pt-0 pb-2">
              {isLoading ? (
                <ActivitySkeleton />
              ) : (eventsData ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-container-high mb-3">
                    <Icon
                      name="event_available"
                      size={24}
                      className="text-on-surface-variant"
                    />
                  </div>
                  <p className="text-title-medium mb-1">All clear</p>
                  <p className="text-body-medium text-on-surface-variant">
                    No upcoming events in the next 30 days
                  </p>
                </div>
              ) : (
                <List aria-label="List">
                  {(eventsData ?? []).slice(0, 5).map((event) => (
                    <ListItem
                      key={event.id}
                      leading={
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/12">
                          <Icon
                            name="calendar_today"
                            size={20}
                            className="text-primary"
                          />
                        </div>
                      }
                      supportingText={new Date(
                        event.startDate
                      ).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      trailing={
                        <AssistChip
                          leadingIcon={<Icon name={event.allDay ? "sunny" : "schedule"} />}
                        >
                          {event.allDay ? "All day" : "Timed"}
                        </AssistChip>
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
              <CardTitle className="text-title-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Button variant="tonal" className="w-full justify-start" leadingIcon={<Icon name="person_add" />}>
                Add Member
              </Button>
              <Button variant="tonal" className="w-full justify-start" leadingIcon={<Icon name="account_tree" />}>
                View Org Chart
              </Button>
              <Button variant="tonal" className="w-full justify-start" leadingIcon={<Icon name="event_available" />}>
                Submit Leave
              </Button>
              <Button variant="tonal" className="w-full justify-start" leadingIcon={<Icon name="description" />}>
                Generate Report
              </Button>

              <Divider className="my-2" />

              <Button variant="filled" className="w-full justify-start" leadingIcon={<Icon name="add" />}>
                New Request
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </motion.div>
  );
}
