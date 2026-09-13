"use client";

import { useState, useMemo } from "react";
import type { CalendarEvent, CalendarFilter, OrgUnit } from "./types/calendar.types";
import { formatMonthYear } from "./utils/calendar.utils";
import {
  PageBar,
  Icon,
  Chip,
  Typography,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@vkieu/mui";
import { Button, IconButton } from "@vkieu/mui/buttons";
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

// ─── Event detail dialog ──────────────────────────────────────────────────────

function EventDetailDialog({
  event,
  onClose,
  canApprove,
  canReject,
  canCancel,
  onApprove,
  onReject,
  onCancel,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (!event) return null;

  const isPending = event.leaveRequest?.status === "PENDING";

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>{event.ownerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Typography variant="label-large" as="span">Type:</Typography>
            <Typography variant="body-medium" as="span" color="surface-variant-foreground">{event.eventType.name}</Typography>
          </div>
          <div className="flex items-center gap-2">
            <Typography variant="label-large" as="span">Date:</Typography>
            <Typography variant="body-medium" as="span" color="surface-variant-foreground">
              {new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}
            </Typography>
          </div>
          {event.leaveRequest && (
            <>
              <div className="flex items-center gap-2">
                <Typography variant="label-large" as="span">Status:</Typography>
                <Chip
                  variant="filter"
                  selected={event.leaveRequest.status === "APPROVED"}
                  className={
                    event.leaveRequest.status === "PENDING" ? "text-amber-600 dark:text-amber-400" :
                    event.leaveRequest.status === "REJECTED" ? "text-error" : ""
                  }
                >
                  {event.leaveRequest.status}
                </Chip>
              </div>
              <div className="flex items-center gap-2">
                <Typography variant="label-large" as="span">Working Days:</Typography>
                <Typography variant="body-medium" as="span" color="surface-variant-foreground">{event.leaveRequest.workingDays}</Typography>
              </div>
            </>
          )}
          {event.notes && (
            <div>
              <Typography variant="label-large">Notes:</Typography>
              <Typography variant="body-medium" color="surface-variant-foreground">{event.notes}</Typography>
            </div>
          )}
        </div>

        {isPending && (canApprove || canReject || canCancel) && (
          <DialogFooter>
            {canCancel && (
              <Button variant="text" className="text-error" onClick={() => onCancel(event.id)}>
                Cancel
              </Button>
            )}
            {canReject && (
              <Button variant="text" className="text-error" onClick={() => onReject(event.id)}>
                Reject
              </Button>
            )}
            {canApprove && (
              <Button variant="text" onClick={() => onApprove(event.id)}>
                Approve
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Calendar view ────────────────────────────────────────────────────────────

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
    MOCK_ORG_UNITS[0].members.map((m) => m.id),
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

  const pendingRequests = useMemo(
    () => events.filter((ev) => ev.leaveRequest?.status === "PENDING"),
    [events],
  );

  function goToPreviousMonth() { setCurrentDate(new Date(year, month - 1, 1)); }
  function goToNextMonth() { setCurrentDate(new Date(year, month + 1, 1)); }
  function goToToday() { setCurrentDate(new Date()); }

  function handleDateClick(date: Date) {
    setSelectedDate(date);
    setShowLeaveForm(true);
  }

  function handleApprove(eventId: string) { updateEventStatus(eventId, "APPROVED"); setSelectedEvent(null); }
  function handleReject(eventId: string) { updateEventStatus(eventId, "REJECTED"); setSelectedEvent(null); }
  function handleCancel(eventId: string) { updateEventStatus(eventId, "CANCELLED"); setSelectedEvent(null); }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <PageBar className="justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-4">
          <Typography variant="title-large">Calendar</Typography>
          <div className="flex items-center gap-1">
            <IconButton variant="standard" size="xs" onClick={goToPreviousMonth} aria-label="Previous month">
              <Icon name="chevron_left" size={20} />
            </IconButton>
            <Typography variant="label-large" as="span" className="min-w-40 text-center">
              {formatMonthYear(currentDate)}
            </Typography>
            <IconButton variant="standard" size="xs" onClick={goToNextMonth} aria-label="Next month">
              <Icon name="chevron_right" size={20} />
            </IconButton>
            <Button variant="outlined" size="xs" onClick={goToToday} className="ml-2">
              Today
            </Button>
            <Button
              variant={showWeekends ? "tonal" : "outlined"}
              size="xs"
              onClick={() => setShowWeekends(!showWeekends)}
              className="ml-2"
            >
              {showWeekends ? "Hide weekends" : "Show weekends"}
            </Button>
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
              <Button variant="outlined" onClick={() => setShowEventForm(true)}>
                <Icon name="event" size={18} />
                New Event
              </Button>
              <Button onClick={() => setShowLeaveForm(true)}>
                <Icon name="event_available" size={18} />
                Request Leave
              </Button>
            </>
          )}
        </div>
      </PageBar>

      {/* Main content */}
      <div className="flex flex-1 justify-between gap-3 min-h-0 overflow-hidden">
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
              setDragRange({ start, end });
            }}
            onEventClick={(event) => setSelectedEvent(event)}
          />
        </main>

        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto lg:block">
          <LeaveBalancePanel balances={balances} onRequestLeave={() => setShowLeaveForm(true)} />

          {pendingRequests.length > 0 && (
            <div className="mt-6">
              <Typography variant="title-small" className="mb-3">
                {canApprove || canReject ? "Pending Approvals" : "Pending Requests"}
              </Typography>
              <div className="space-y-2">
                {pendingRequests.map((event) => (
                  <div key={event.id} className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-2.5">
                    <Typography variant="label-large" className="truncate">{event.title}</Typography>
                    <Typography variant="body-small" color="surface-variant-foreground" className="mt-0.5">
                      {event.leaveRequest?.workingDays} days
                    </Typography>
                    <div className="mt-1.5 flex items-center gap-2">
                      {canApprove && (
                        <button type="button" onClick={() => handleApprove(event.id)} className="text-[11px] font-medium text-tertiary hover:underline">
                          Approve
                        </button>
                      )}
                      {canReject && (
                        <button type="button" onClick={() => handleReject(event.id)} className="text-[11px] font-medium text-error hover:underline">
                          Reject
                        </button>
                      )}
                      {canCancel && !(canApprove || canReject) && (
                        <button type="button" onClick={() => handleCancel(event.id)} className="text-[11px] font-medium text-error hover:underline">
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

      {/* Event detail dialog */}
      <EventDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        canApprove={canApprove}
        canReject={canReject}
        canCancel={canCancel}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
      />

      {/* Leave Request Form Modal */}
      <LeaveRequestForm
        isOpen={showLeaveForm}
        onClose={() => { setShowLeaveForm(false); setSelectedDate(null); setDragRange(null); }}
        onSubmit={(event) => addEvent(event)}
        balances={balances}
        defaultDate={selectedDate ?? undefined}
        defaultEndDate={dragRange?.end ?? undefined}
      />

      {/* Event Form Modal */}
      <EventForm
        isOpen={showEventForm}
        onClose={() => { setShowEventForm(false); setSelectedDate(null); }}
        onSubmit={(event) => addEvent(event)}
        defaultDate={selectedDate ?? undefined}
      />
    </div>
  );
}
