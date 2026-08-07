"use client";

import { motion } from "motion/react";
import { CalendarView } from "@/features/calendar/CalendarView";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="h-[calc(100vh-64px-24px)] flex flex-col space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-2 flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-64px-24px)] flex items-center justify-center">
        <Card variant="filled" className="max-w-lg">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {error?.message || "Failed to load calendar data"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
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
