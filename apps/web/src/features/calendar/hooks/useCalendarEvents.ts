"use client";

import { useState, useMemo } from "react";
import type { CalendarEvent, CalendarFilter } from "../types/calendar.types";

/**
 * Mock calendar events spanning the current month.
 */
function generateMockEvents(): CalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const eventTypes = {
    leave: { id: "et-1", companyId: "c1", name: "Leave", color: "#10B981", isSystem: true },
    sick: { id: "et-2", companyId: "c1", name: "Sick Leave", color: "#EF4444", isSystem: true },
    conference: { id: "et-3", companyId: "c1", name: "Conference", color: "#8B5CF6", isSystem: true },
    training: { id: "et-4", companyId: "c1", name: "Training", color: "#F59E0B", isSystem: true },
    meeting: { id: "et-5", companyId: "c1", name: "Meeting", color: "#3B82F6", isSystem: true },
    ooo: { id: "et-6", companyId: "c1", name: "Out of Office", color: "#6B7280", isSystem: true },
    wfh: { id: "et-7", companyId: "c1", name: "Work From Home", color: "#06B6D4", isSystem: true },
  };

  const leaveTypes = {
    annual: { id: "lt-1", companyId: "c1", name: "Annual", color: "#10B981", defaultAllocation: 25, requiresApproval: true, carryOver: true, maxCarryOverDays: 5, isSystem: true },
    sick: { id: "lt-2", companyId: "c1", name: "Sick", color: "#EF4444", defaultAllocation: 10, requiresApproval: true, carryOver: false, isSystem: true },
    personal: { id: "lt-3", companyId: "c1", name: "Personal", color: "#8B5CF6", defaultAllocation: 3, requiresApproval: true, carryOver: false, isSystem: true },
  };

  const events: CalendarEvent[] = [
    // Approved leave
    {
      id: "ev-1", companyId: "c1", ownerUserId: "u1", ownerName: "Sarah Chen",
      eventTypeId: "et-1", eventType: eventTypes.leave,
      title: "Annual Leave - Sarah Chen", startDate: new Date(year, month, 5).toISOString(), endDate: new Date(year, month, 9).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-1", calendarEventId: "ev-1", leaveTypeId: "lt-1", leaveType: leaveTypes.annual, status: "APPROVED", workingDays: 5, reviewerId: "u-mgr", reviewedAt: new Date(year, month, 1).toISOString() },
    },
    // Pending leave
    {
      id: "ev-2", companyId: "c1", ownerUserId: "u2", ownerName: "Marcus Johnson",
      eventTypeId: "et-1", eventType: eventTypes.leave,
      title: "Annual Leave - Marcus Johnson", startDate: new Date(year, month, 12).toISOString(), endDate: new Date(year, month, 16).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-2", calendarEventId: "ev-2", leaveTypeId: "lt-1", leaveType: leaveTypes.annual, status: "PENDING", workingDays: 5 },
    },
    // Sick leave (pending)
    {
      id: "ev-3", companyId: "c1", ownerUserId: "u3", ownerName: "Emily Rodriguez",
      eventTypeId: "et-2", eventType: eventTypes.sick,
      title: "Sick Leave - Emily Rodriguez", startDate: new Date(year, month, 10).toISOString(), endDate: new Date(year, month, 11).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-3", calendarEventId: "ev-3", leaveTypeId: "lt-2", leaveType: leaveTypes.sick, status: "PENDING", workingDays: 2 },
    },
    // Conference
    {
      id: "ev-4", companyId: "c1", ownerUserId: "u1", ownerName: "Sarah Chen",
      eventTypeId: "et-3", eventType: eventTypes.conference,
      title: "React Summit 2024", startDate: new Date(year, month, 18).toISOString(), endDate: new Date(year, month, 20).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Training
    {
      id: "ev-5", companyId: "c1", ownerUserId: "u4", ownerName: "David Park",
      eventTypeId: "et-4", eventType: eventTypes.training,
      title: "Leadership Workshop", startDate: new Date(year, month, 8).toISOString(), endDate: new Date(year, month, 8).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Weekly team meeting (recurring)
    {
      id: "ev-6", companyId: "c1", ownerUserId: "u1", ownerName: "Sarah Chen",
      eventTypeId: "et-5", eventType: eventTypes.meeting,
      title: "Team Standup", startDate: new Date(year, month, 3, 9, 0).toISOString(), endDate: new Date(year, month, 3, 9, 30).toISOString(),
      allDay: false, visibility: "SHARED", isRecurring: true, recurrenceFrequency: "WEEKLY", recurrenceDaysOfWeek: [1, 3, 5],
    },
    // WFH
    {
      id: "ev-7", companyId: "c1", ownerUserId: "u5", ownerName: "Aisha Patel",
      eventTypeId: "et-7", eventType: eventTypes.wfh,
      title: "WFH - Aisha Patel", startDate: new Date(year, month, 14).toISOString(), endDate: new Date(year, month, 14).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Out of Office
    {
      id: "ev-8", companyId: "c1", ownerUserId: "u6", ownerName: "James Wilson",
      eventTypeId: "et-6", eventType: eventTypes.ooo,
      title: "OOO - James Wilson", startDate: new Date(year, month, 22).toISOString(), endDate: new Date(year, month, 24).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Approved annual leave
    {
      id: "ev-9", companyId: "c1", ownerUserId: "u7", ownerName: "Lisa Wang",
      eventTypeId: "et-1", eventType: eventTypes.leave,
      title: "Annual Leave - Lisa Wang", startDate: new Date(year, month, 25).toISOString(), endDate: new Date(year, month, 28).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-4", calendarEventId: "ev-9", leaveTypeId: "lt-1", leaveType: leaveTypes.annual, status: "APPROVED", workingDays: 4, reviewerId: "u-mgr", reviewedAt: new Date(year, month, 20).toISOString() },
    },
    // Personal leave (pending)
    {
      id: "ev-10", companyId: "c1", ownerUserId: "u8", ownerName: "Tom Martinez",
      eventTypeId: "et-1", eventType: eventTypes.leave,
      title: "Personal Leave - Tom Martinez", startDate: new Date(year, month, 15).toISOString(), endDate: new Date(year, month, 15).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-5", calendarEventId: "ev-10", leaveTypeId: "lt-3", leaveType: leaveTypes.personal, status: "PENDING", workingDays: 1 },
    },
    // Meeting
    {
      id: "ev-11", companyId: "c1", ownerUserId: "u2", ownerName: "Marcus Johnson",
      eventTypeId: "et-5", eventType: eventTypes.meeting,
      title: "Q4 Planning Review", startDate: new Date(year, month, 19, 14, 0).toISOString(), endDate: new Date(year, month, 19, 16, 0).toISOString(),
      allDay: false, visibility: "SHARED", isRecurring: false,
    },
    // Training
    {
      id: "ev-12", companyId: "c1", ownerUserId: "u3", ownerName: "Emily Rodriguez",
      eventTypeId: "et-4", eventType: eventTypes.training,
      title: "AWS Certification Prep", startDate: new Date(year, month, 21).toISOString(), endDate: new Date(year, month, 22).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Conference
    {
      id: "ev-13", companyId: "c1", ownerUserId: "u4", ownerName: "David Park",
      eventTypeId: "et-3", eventType: eventTypes.conference,
      title: "DevOps Days", startDate: new Date(year, month, 26).toISOString(), endDate: new Date(year, month, 27).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // WFH Friday
    {
      id: "ev-14", companyId: "c1", ownerUserId: "u2", ownerName: "Marcus Johnson",
      eventTypeId: "et-7", eventType: eventTypes.wfh,
      title: "WFH - Marcus Johnson", startDate: new Date(year, month, 7).toISOString(), endDate: new Date(year, month, 7).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
    },
    // Sick leave approved
    {
      id: "ev-15", companyId: "c1", ownerUserId: "u5", ownerName: "Aisha Patel",
      eventTypeId: "et-2", eventType: eventTypes.sick,
      title: "Sick Leave - Aisha Patel", startDate: new Date(year, month, 2).toISOString(), endDate: new Date(year, month, 3).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-6", calendarEventId: "ev-15", leaveTypeId: "lt-2", leaveType: leaveTypes.sick, status: "APPROVED", workingDays: 2, reviewerId: "u-mgr", reviewedAt: new Date(year, month, 1).toISOString() },
    },
    // Personal event (visibility = PERSONAL)
    {
      id: "ev-16", companyId: "c1", ownerUserId: "u1", ownerName: "Sarah Chen",
      eventTypeId: "et-5", eventType: eventTypes.meeting,
      title: "Dentist Appointment", startDate: new Date(year, month, 11, 10, 0).toISOString(), endDate: new Date(year, month, 11, 11, 0).toISOString(),
      allDay: false, visibility: "PERSONAL", isRecurring: false,
    },
    // Another meeting
    {
      id: "ev-17", companyId: "c1", ownerUserId: "u6", ownerName: "James Wilson",
      eventTypeId: "et-5", eventType: eventTypes.meeting,
      title: "Sprint Retrospective", startDate: new Date(year, month, 17, 15, 0).toISOString(), endDate: new Date(year, month, 17, 16, 0).toISOString(),
      allDay: false, visibility: "SHARED", isRecurring: false,
    },
    // Cross-week leave (7 working days spanning 2 weeks)
    {
      id: "ev-18", companyId: "c1", ownerUserId: "u4", ownerName: "David Park",
      eventTypeId: "et-1", eventType: eventTypes.leave,
      title: "Annual Leave - David Park", startDate: new Date(year, month, 11).toISOString(), endDate: new Date(year, month, 19).toISOString(),
      allDay: true, visibility: "SHARED", isRecurring: false,
      leaveRequest: { id: "lr-7", calendarEventId: "ev-18", leaveTypeId: "lt-1", leaveType: leaveTypes.annual, status: "APPROVED", workingDays: 7, reviewerId: "u-mgr", reviewedAt: new Date(year, month, 8).toISOString() },
    },
  ];

  return events;
}

export interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  isLoading: boolean;
  addEvent: (event: CalendarEvent) => void;
  updateEventStatus: (eventId: string, status: "APPROVED" | "REJECTED" | "CANCELLED") => void;
}

export function useCalendarEvents(filters?: CalendarFilter): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>(() => generateMockEvents());
  const isLoading = false;

  const filteredEvents = useMemo(() => {
    if (!filters) return events;

    return events.filter((event) => {
      if (filters.eventTypeIds.length > 0 && !filters.eventTypeIds.includes(event.eventTypeId)) {
        return false;
      }
      if (filters.userIds.length > 0 && !filters.userIds.includes(event.ownerUserId)) {
        return false;
      }
      return true;
    });
  }, [events, filters]);

  function addEvent(event: CalendarEvent) {
    setEvents((prev) => [...prev, event]);
  }

  function updateEventStatus(eventId: string, status: "APPROVED" | "REJECTED" | "CANCELLED") {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === eventId && ev.leaveRequest) {
          return {
            ...ev,
            leaveRequest: { ...ev.leaveRequest, status, reviewedAt: new Date().toISOString(), reviewerId: "u-mgr" },
          };
        }
        return ev;
      })
    );
  }

  return { events: filteredEvents, isLoading, addEvent, updateEventStatus };
}
