"use client";

import { CalendarView } from "@/features/calendar/CalendarView";
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
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load calendar data"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px-24px)]">
      <CalendarView />
    </div>
  );
}
