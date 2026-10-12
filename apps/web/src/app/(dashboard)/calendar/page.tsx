"use client";

import { motion } from "motion/react";
import { CalendarView } from "@/features/calendar/CalendarView";
import { Button, Card } from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
import {
  useCalendarEvents,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

export default function CalendarPage() {
  const reduced = useReducedMotionContext();
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
        <Card variant="filled" className="max-w-lg">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <p className="text-title-medium mb-2">Unable to load calendar</p>
            <p className="text-body-medium text-on-surface-variant mb-6">
              {error?.message || "Failed to load calendar data. Please try again."}
            </p>
            <Button
              variant="filled"
              leadingIcon={<Icon name="refresh" />}
              onClick={() => refetch()}
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
      className="h-[calc(100vh-64px-24px)]"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <CalendarView />
    </motion.div>
  );
}
