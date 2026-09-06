"use client";

import { useState, useMemo } from "react";
import type { CalendarEvent, CalendarFilter, OrgUnit } from "./types/calendar.types";
import { formatMonthYear } from "./utils/calendar.utils";
import { AppBar } from "@/components/layout/app-bar";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { useLeaveBalances } from "./hooks/useLeaveBalances";
import { CalendarGrid } from "./components/CalendarGrid";
import { FilterSelector } from "./components/FilterSelector";
import { LeaveBalancePanel } from "./components/LeaveBalancePanel";
import { LeaveRequestForm } from "./components/LeaveRequestForm";
import { EventForm } from "./components/EventForm";
import { ApprovalActions } from "./components/ApprovalActions";
import { useUserPermissions } from "@/hooks/use-user-permissions";

/** Mock accessible scope data */
const MOCK_ORG_UNITS: OrgUnit[] = [
  {
    id: "ou-1",
    name: "Engineering Team",
    members: [
      { id: "u1", name: "Sarah Chen", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u2", name: "Marcus Johnson", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u3", name: "Emily Rodriguez", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u4", name: "David Park", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u5", name: "Aisha Patel", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u6", name: "James Wilson", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u7", name: "Lisa Wang", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
      { id: "u8", name: "Tom Martinez", orgUnitId: "ou-1", orgUnitName: "Engineering Team" },
    ],
  },
  {
    id: "ou-2",
    name: "Design Team",
    members: [
      { id: "u9", name: "Alex Kim", orgUnitId: "ou-2", orgUnitName: "Design Team" },
      { id: "u10", name: "Jordan Lee", orgUnitId: "ou-2", orgUnitName: "Design Team" },
      { id: "u11", name: "Sophie Brown", orgUnitId: "ou-2", orgUnitName: "Design Team" },
      { id: "u12", name: "Ryan Taylor", orgUnitId: "ou-2", orgUnitName: "Design Team" },
      { id: "u13", name: "Mia Davis", orgUnitId: "ou-2", orgUnitName: "Design Team" },
    ],
  },
];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dragRange, setDragRange] = useState<{ start: Date; end: Date } | null>(null);
  const [showWeekends, setShowWeekends] = useState(false);

  // Filters
  const [selectedOrgUnitIds, setSelectedOrgUnitIds] = useState<string[]>(["ou-1"]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    MOCK_ORG_UNITS[0].members.map((m) => m.id)
  );

  const filters: CalendarFilter = {
    orgUnitIds: selectedOrgUnitIds,
    userIds: selectedUserIds,
    eventTypeIds: [],
    leaveTypeIds: [],
  };

  const { events, addEvent, updateEventStatus } = useCalendarEvents(filters);
  const { balances } = useLeaveBalances();
  const { hasPermission } = useUserPermissions();
  const canManageCalendar = hasPermission("calendar", "manage");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Pending leave requests that the current user (manager) can act on
  const pendingRequests = useMemo(() => {
    return events.filter((ev) => ev.leaveRequest?.status === "PENDING");
  }, [events]);

  function goToPreviousMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleDateClick(date: Date) {
    setSelectedDate(date);
    // Show a choice - for simplicity, we'll show leave form by default
    setShowLeaveForm(true);
  }

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  function handleLeaveSubmit(event: CalendarEvent) {
    addEvent(event);
  }

  function handleEventSubmit(event: CalendarEvent) {
    addEvent(event);
  }

  function handleApprove(eventId: string) {
    updateEventStatus(eventId, "APPROVED");
    setSelectedEvent(null);
  }

  function handleReject(eventId: string) {
    updateEventStatus(eventId, "REJECTED");
    setSelectedEvent(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <AppBar className="justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-40 text-center text-sm font-medium text-foreground">
              {formatMonthYear(currentDate)}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setShowWeekends(!showWeekends)}
              className={`ml-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                showWeekends
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {showWeekends ? "Hide weekends" : "Show weekends"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <FilterSelector
            orgUnits={MOCK_ORG_UNITS}
            selectedOrgUnitIds={selectedOrgUnitIds}
            selectedUserIds={selectedUserIds}
            onOrgUnitsChange={setSelectedOrgUnitIds}
            onUserIdsChange={setSelectedUserIds}
          />
          <button
            type="button"
            onClick={() => setShowEventForm(true)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            New Event
          </button>
          <button
            type="button"
            onClick={() => setShowLeaveForm(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Request Leave
          </button>
        </div>
      </AppBar>

      {/* Main content area */}
      <div className="flex flex-1 justify-between gap-3 min-h-0 overflow-hidden">
        {/* Calendar Grid */}
        <main className="flex-1 min-h-0 overflow-auto">
          <CalendarGrid
            year={year}
            month={month}
            events={events}
            showWeekends={showWeekends}
            onDateClick={handleDateClick}
            onDateRangeSelect={(start, end) => {
              setSelectedDate(start);
              setShowLeaveForm(true);
              // The LeaveRequestForm will receive these as defaultStart/defaultEnd
              setDragRange({ start, end });
            }}
            onEventClick={handleEventClick}
          />
        </main>

        {/* Sidebar (right side) */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto lg:block">
          <LeaveBalancePanel balances={balances} onRequestLeave={() => setShowLeaveForm(true)} />

          {/* Pending requests needing approval — only for managers */}
          {canManageCalendar && pendingRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Pending Approvals</h3>
              <div className="space-y-2">
                {pendingRequests.map((event) => (
                  <div key={event.id} className="rounded-md border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-2">
                    <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {event.leaveRequest?.workingDays} days
                    </p>
                    <div className="mt-1.5">
                      <ApprovalActions
                        eventId={event.id}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedEvent(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">{selectedEvent.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedEvent.ownerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Type:</span> {selectedEvent.eventType.name}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Date:</span>{" "}
                {new Date(selectedEvent.startDate).toLocaleDateString()} – {new Date(selectedEvent.endDate).toLocaleDateString()}
              </p>
              {selectedEvent.leaveRequest && (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Status:</span>{" "}
                    <span className={
                      selectedEvent.leaveRequest.status === "APPROVED" ? "text-green-600 dark:text-green-400" :
                      selectedEvent.leaveRequest.status === "PENDING" ? "text-amber-600 dark:text-amber-400" :
                      selectedEvent.leaveRequest.status === "REJECTED" ? "text-red-600 dark:text-red-400" :
                      "text-muted-foreground"
                    }>
                      {selectedEvent.leaveRequest.status}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Working Days:</span> {selectedEvent.leaveRequest.workingDays}
                  </p>
                </>
              )}
              {selectedEvent.notes && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Notes:</span> {selectedEvent.notes}
                </p>
              )}
            </div>
            {canManageCalendar && selectedEvent.leaveRequest?.status === "PENDING" && (
              <div className="mt-4 border-t border-border pt-3">
                <ApprovalActions
                  eventId={selectedEvent.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Request Form Modal */}
      <LeaveRequestForm
        isOpen={showLeaveForm}
        onClose={() => {
          setShowLeaveForm(false);
          setSelectedDate(null);
          setDragRange(null);
        }}
        onSubmit={handleLeaveSubmit}
        balances={balances}
        defaultDate={selectedDate ?? undefined}
        defaultEndDate={dragRange?.end ?? undefined}
      />

      {/* Event Form Modal */}
      <EventForm
        isOpen={showEventForm}
        onClose={() => {
          setShowEventForm(false);
          setSelectedDate(null);
        }}
        onSubmit={handleEventSubmit}
        defaultDate={selectedDate ?? undefined}
      />
    </div>
  );
}
