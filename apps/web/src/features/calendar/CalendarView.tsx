"use client";

import { useState, useMemo } from "react";
import type { CalendarEvent, CalendarFilter, OrgUnit } from "./types/calendar.types";
import { formatMonthYear } from "./utils/calendar.utils";
import { PageBar } from "@vkieu/mui";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { useLeaveBalances } from "./hooks/useLeaveBalances";
import { CalendarGrid } from "./components/CalendarGrid";
import { FilterSelector } from "./components/FilterSelector";
import { LeaveBalancePanel } from "./components/LeaveBalancePanel";
import { LeaveRequestForm } from "./components/LeaveRequestForm";
import { EventForm } from "./components/EventForm";
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
  const canCreate = hasPermission("calendar", "create");
  const canCancel = hasPermission("calendar", "cancel");
  const canApprove = hasPermission("calendar", "approve");
  const canReject = hasPermission("calendar", "reject");

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

  function handleCancel(eventId: string) {
    updateEventStatus(eventId, "CANCELLED");
    setSelectedEvent(null);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <PageBar className="justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-on-surface">Calendar</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-40 text-center text-sm font-medium text-on-surface">
              {formatMonthYear(currentDate)}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-2 rounded-md border border-outline-variant px-2.5 py-1 text-xs font-medium text-on-surface hover:bg-surface-variant transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setShowWeekends(!showWeekends)}
              className={`ml-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                showWeekends
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-variant"
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
          {canCreate && (
            <>
              <button
                type="button"
                onClick={() => setShowEventForm(true)}
                className="rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-variant transition-colors"
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
            </>
          )}
        </div>
      </PageBar>

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

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-on-surface mb-3">
                {(canApprove || canReject) ? "Pending Approvals" : "Pending Requests"}
              </h3>
              <div className="space-y-2">
                {pendingRequests.map((event) => (
                  <div key={event.id} className="rounded-md border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-2">
                    <p className="text-xs font-medium text-on-surface truncate">{event.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {event.leaveRequest?.workingDays} days
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {canApprove && (
                        <button
                          type="button"
                          onClick={() => handleApprove(event.id)}
                          className="text-[11px] font-medium text-tertiary hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      {canReject && (
                        <button
                          type="button"
                          onClick={() => handleReject(event.id)}
                          className="text-[11px] font-medium text-error hover:underline"
                        >
                          Reject
                        </button>
                      )}
                      {canCancel && !(canApprove || canReject) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(event.id)}
                          className="text-[11px] font-medium text-error hover:underline"
                        >
                          Cancel Request
                        </button>
                      )}
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
          <div className="fixed inset-0 bg-inverse-surface/30" onClick={() => setSelectedEvent(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-low p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-on-surface">{selectedEvent.title}</h3>
                <p className="text-sm text-on-surface-variant mt-1">{selectedEvent.ownerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-on-surface-variant hover:text-on-surface"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-on-surface-variant">
                <span className="font-medium text-on-surface">Type:</span> {selectedEvent.eventType.name}
              </p>
              <p className="text-sm text-on-surface-variant">
                <span className="font-medium text-on-surface">Date:</span>{" "}
                {new Date(selectedEvent.startDate).toLocaleDateString()} – {new Date(selectedEvent.endDate).toLocaleDateString()}
              </p>
              {selectedEvent.leaveRequest && (
                <>
                  <p className="text-sm text-on-surface-variant">
                    <span className="font-medium text-on-surface">Status:</span>{" "}
                    <span className={
                      selectedEvent.leaveRequest.status === "APPROVED" ? "text-tertiary" :
                      selectedEvent.leaveRequest.status === "PENDING" ? "text-amber-600 dark:text-amber-400" :
                      selectedEvent.leaveRequest.status === "REJECTED" ? "text-error" :
                      "text-on-surface-variant"
                    }>
                      {selectedEvent.leaveRequest.status}
                    </span>
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    <span className="font-medium text-on-surface">Working Days:</span> {selectedEvent.leaveRequest.workingDays}
                  </p>
                </>
              )}
              {selectedEvent.notes && (
                <p className="text-sm text-on-surface-variant">
                  <span className="font-medium text-on-surface">Notes:</span> {selectedEvent.notes}
                </p>
              )}
            </div>
            {selectedEvent.leaveRequest?.status === "PENDING" && (
              <div className="mt-4 border-t border-outline-variant pt-3 flex items-center gap-3">
                {canApprove && (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedEvent.id)}
                    className="rounded-md bg-tertiary px-3 py-1.5 text-sm font-medium text-on-primary hover:bg-tertiary transition-colors"
                  >
                    Approve
                  </button>
                )}
                {canReject && (
                  <button
                    type="button"
                    onClick={() => handleReject(selectedEvent.id)}
                    className="rounded-md border border-error px-3 py-1.5 text-sm font-medium text-error hover:bg-error-container dark:hover:bg-error-container/20 transition-colors"
                  >
                    Reject
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedEvent.id)}
                    className="text-sm font-medium text-error hover:underline"
                  >
                    Cancel
                  </button>
                )}
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
