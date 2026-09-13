"use client";

import { useState } from "react";
import type { CalendarEvent, EventVisibility, RecurrenceFrequency } from "../types/calendar.types";

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: CalendarEvent) => void;
  defaultDate?: Date;
}

const EVENT_TYPES = [
  { id: "et-5", name: "Meeting" },
  { id: "et-4", name: "Training" },
  { id: "et-3", name: "Conference" },
  { id: "et-6", name: "Out of Office" },
  { id: "et-7", name: "Work From Home" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export function EventForm({ isOpen, onClose, onSubmit, defaultDate }: EventFormProps) {
  const [title, setTitle] = useState("");
  const [eventTypeId, setEventTypeId] = useState(EVENT_TYPES[0].id);
  const [startDate, setStartDate] = useState(defaultDate ? formatDateInput(defaultDate) : formatDateInput(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(defaultDate ? formatDateInput(defaultDate) : formatDateInput(new Date()));
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(true);
  const [visibility, setVisibility] = useState<EventVisibility>("SHARED");
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | "">("");
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!title.trim()) validationErrors.push("Title is required");

    const start = allDay ? new Date(`${startDate}T00:00:00`) : new Date(`${startDate}T${startTime}`);
    const end = allDay ? new Date(`${endDate}T23:59:59`) : new Date(`${endDate}T${endTime}`);

    if (start >= end && !allDay) validationErrors.push("End time must be after start time");
    if (new Date(startDate) > new Date(endDate)) validationErrors.push("End date must be on or after start date");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const selectedType = EVENT_TYPES.find((t) => t.id === eventTypeId);
    const event: CalendarEvent = {
      id: `ev-new-${Date.now()}`,
      companyId: "c1",
      ownerUserId: "u1",
      ownerName: "You",
      eventTypeId,
      eventType: { id: eventTypeId, companyId: "c1", name: selectedType?.name ?? "Meeting", color: "#3B82F6", isSystem: true },
      title: title.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      allDay,
      visibility,
      isRecurring: recurrence !== "",
      recurrenceFrequency: recurrence || undefined,
    };

    onSubmit(event);
    resetForm();
    onClose();
  }

  function resetForm() {
    setTitle("");
    setEventTypeId(EVENT_TYPES[0].id);
    setAllDay(true);
    setVisibility("SHARED");
    setRecurrence("");
    setErrors([]);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-scrim/50" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-low p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-on-surface">Create Event</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errors.length > 0 && (
            <div className="rounded-md bg-error-container p-3 dark:bg-error-container/20">
              {errors.map((err) => (
                <p key={err} className="text-sm text-error">{err}</p>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-on-surface">Title</label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Event title"
            />
          </div>

          <div>
            <label htmlFor="event-type" className="block text-sm font-medium text-on-surface">Event Type</label>
            <select
              id="event-type"
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="all-day"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="all-day" className="text-sm text-on-surface">All Day</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-on-surface">Start Date</label>
              <input
                id="event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-on-surface">End Date</label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-start-time" className="block text-sm font-medium text-on-surface">Start Time</label>
                <input
                  id="event-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="event-end-time" className="block text-sm font-medium text-on-surface">End Time</label>
                <input
                  id="event-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="event-visibility" className="block text-sm font-medium text-on-surface">Visibility</label>
            <select
              id="event-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="SHARED">Shared (visible to team)</option>
              <option value="PERSONAL">Personal (only you)</option>
            </select>
          </div>

          <div>
            <label htmlFor="event-recurrence" className="block text-sm font-medium text-on-surface">Recurrence</label>
            <select
              id="event-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency | "")}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
