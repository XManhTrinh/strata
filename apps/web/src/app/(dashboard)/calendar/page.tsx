"use client";

import { motion } from "motion/react";
import { CalendarView } from "@/features/calendar/CalendarView";
import { Button, Card } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Typography } from "@/components/ui/typography";
import { Skeleton, SkeletonGroup } from "@vkieu/mui/vk";
import {
  useCalendarEvents,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

export default function CalendarPage() {
  const companyId = useCompanyId();
  const {
    isLoading,
    isError,
    error,
    refetch,
  } = useCalendarEvents(companyId, {
    startDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split("T")[0],
    endDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0],
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px-24px)] flex flex-col gap-6 p-4">
        <SkeletonGroup label="Loading calendar">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-64" corner="extra-small" />
            <Skeleton className="h-10 w-32" corner="extra-small" />
          </div>
          <Card variant="elevated" className="flex-1">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-2 h-full">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" corner="extra-large" />
                ))}
              </div>
            </CardContent>
          </Card>
        </SkeletonGroup>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-64px-24px)] flex items-center justify-center">
        <Card variant="elevated" className="max-w-lg">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <Typography variant="title-large" className="mb-2">
              Unable to load calendar
            </Typography>
            <Typography variant="body-medium" color="surface-variant-foreground" className="mb-6">
              {error?.message || "Failed to load calendar data. Please try again."}
            </Typography>
            <Button variant="tonal" onClick={() => refetch()}>
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
      className="h-[calc(100vh-64px-24px)]"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <CalendarView />
    </motion.div>
  );
}
