"use client";

import { motion } from "motion/react";
import { CalendarView } from "@/features/calendar/CalendarView";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCalendarEvents,
  useCreateLeaveRequest,
} from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

const COMPANY_ID = "cm_acme_corp_001";

export default function CalendarPage() {
  const {
    isLoading,
    isError,
    error,
    refetch,
  } = useCalendarEvents(COMPANY_ID, {
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

  // Pre-initialize the mutation so it's ready for use
  useCreateLeaveRequest();

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px-24px)] flex flex-col gap-6 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card variant="elevated" className="flex-1">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2 h-full">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
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
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load calendar
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              {error?.message || "Failed to load calendar data. Please try again."}
            </p>
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
      <Card variant="elevated" className="h-full overflow-hidden">
        <CardContent className="p-0 h-full">
          <CalendarView />
        </CardContent>
      </Card>
    </motion.div>
  );
}
