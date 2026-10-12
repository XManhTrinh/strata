"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Checkbox,
  Button,
  Select,
  SelectItem,
} from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
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
      <DialogTitle>Create Event</DialogTitle>
      <DialogContent>
        <p className="mb-4 text-body-medium text-on-surface-variant">
          Add a new event to the calendar.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" id="event-form">
          {errors.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-error-container p-3 text-on-error-container">
              <Icon name="error" size={16} className="mt-0.5 shrink-0 text-error" />
              <div className="space-y-0.5">
                {errors.map((err) => (
                  <p className="text-body-small" key={err}>
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          <TextField
            variant="outlined"
            label="Title"
            className="w-full"
            value={title}
            onChange={(value) => setTitle(value)}
            placeholder="Event title"
          />

          <Select
            label="Event Type"
            selectedKey={eventTypeId}
            onSelectionChange={(key) => setEventTypeId(key == null ? "" : String(key))}
            variant="outlined"
          >
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type.id}>{type.name}</SelectItem>
            ))}
          </Select>

          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
            <Checkbox aria-label="Toggle"
  id="all-day"
              selected={allDay}
              onSelectedChange={(checked) => setAllDay(checked === true)}
            />
            <label htmlFor="all-day" className="text-body-medium text-on-surface cursor-pointer select-none">
              All Day
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              variant="outlined"
              label="Start Date"
              className="w-full"
              type="date"
              value={startDate}
              onChange={(value) => setStartDate(value)}
            />
            <TextField
              variant="outlined"
              label="End Date"
              className="w-full"
              type="date"
              value={endDate}
              onChange={(value) => setEndDate(value)}
            />
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                variant="outlined"
                label="Start Time"
                className="w-full"
                type="time"
                value={startTime}
                onChange={(value) => setStartTime(value)}
              />
              <TextField
                variant="outlined"
                label="End Time"
                className="w-full"
                type="time"
                value={endTime}
                onChange={(value) => setEndTime(value)}
              />
            </div>
          )}

          <Select
            label="Visibility"
            selectedKey={visibility}
            onSelectionChange={(key) => setVisibility(String(key) as EventVisibility)}
            variant="outlined"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value}>{opt.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Recurrence"
            selectedKey={recurrence}
            onSelectionChange={(key) => setRecurrence((key == null ? "" : String(key)) as RecurrenceFrequency | "")}
            variant="outlined"
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value}>{opt.label}</SelectItem>
            ))}
          </Select>

        </form>
      </DialogContent>
      <DialogActions>
        <Button type="button" variant="text" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" form="event-form" variant="filled">
          Create Event
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
