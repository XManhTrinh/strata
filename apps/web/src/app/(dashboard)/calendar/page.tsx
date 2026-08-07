"use client";

import { CalendarView } from "@/features/calendar/CalendarView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCalendarEvents,
  useCreateLeaveRequest,
} from "@/services";

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
      <div className="h-[calc(100vh-64px-24px)] flex flex-col">
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-10 w-64 rounded bg-muted" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-64px-24px)] flex items-center justify-center">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-sm text-destructive mb-4">
              {error?.message || "Failed to load calendar data"}
            </p>
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px-24px)]">
      <CalendarView />
    </div>
  );
}
