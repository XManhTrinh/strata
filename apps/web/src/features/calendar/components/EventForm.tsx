"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  TextField,
  Select,
  Checkbox,
  Typography,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
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

const VISIBILITY_OPTIONS = [
  { value: "SHARED" as const, label: "Shared (visible to team)" },
  { value: "PERSONAL" as const, label: "Personal (only you)" },
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent icon="event">
        <DialogHeader centered>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Add a new event to the calendar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <div className="rounded-lg bg-error-container p-3 dark:bg-error-container/20">
              {errors.map((err) => (
                <Typography key={err} variant="body-small" color="error">
                  {err}
                </Typography>
              ))}
            </div>
          )}

          <TextField
            variant="outlined"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />

          <Select
            label="Event Type"
            value={eventTypeId}
            onValueChange={setEventTypeId}
            variant="outlined"
            options={EVENT_TYPES.map((type) => ({
              value: type.id,
              label: type.name,
            }))}
          />

          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={(checked) => setAllDay(checked === true)}
            />
            <label htmlFor="all-day" className="text-sm text-surface-foreground cursor-pointer select-none">
              All Day
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              variant="outlined"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              variant="outlined"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                variant="outlined"
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <TextField
                variant="outlined"
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}

          <Select
            label="Visibility"
            value={visibility}
            onValueChange={(v) => setVisibility(v as EventVisibility)}
            variant="outlined"
            options={VISIBILITY_OPTIONS}
          />

          <Select
            label="Recurrence"
            value={recurrence}
            onValueChange={(v) => setRecurrence(v as RecurrenceFrequency | "")}
            variant="outlined"
            options={RECURRENCE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />

          <DialogFooter>
            <Button type="button" variant="text" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="text">
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
