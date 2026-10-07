"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
} from "@vkieu/mui";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import type { CalendarEvent, LeaveBalance } from "../types/calendar.types";
import { calculateWorkingDays, getAvailableBalance } from "../utils/calendar.utils";

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: CalendarEvent) => void;
  balances: LeaveBalance[];
  defaultDate?: Date;
  defaultEndDate?: Date;
}

const LEAVE_TYPES = [
  { id: "lt-1", name: "Annual", eventTypeId: "et-1", color: "#10B981" },
  { id: "lt-2", name: "Sick", eventTypeId: "et-2", color: "#EF4444" },
  { id: "lt-3", name: "Personal", eventTypeId: "et-1", color: "#8B5CF6" },
  { id: "lt-4", name: "Conference", eventTypeId: "et-3", color: "#8B5CF6" },
  { id: "lt-5", name: "Training", eventTypeId: "et-4", color: "#F59E0B" },
];

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LeaveRequestForm({
  isOpen,
  onClose,
  onSubmit,
  balances,
  defaultDate,
  defaultEndDate,
}: LeaveRequestFormProps) {
  const [leaveTypeId, setLeaveTypeId] = useState(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState(
    defaultDate ? formatDateInput(defaultDate) : formatDateInput(new Date()),
  );
  const [endDate, setEndDate] = useState(
    defaultEndDate
      ? formatDateInput(defaultEndDate)
      : defaultDate
        ? formatDateInput(defaultDate)
        : formatDateInput(new Date()),
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const workingDays = calculateWorkingDays(startDate, endDate);
  const selectedBalance = balances.find((b) => b.leaveTypeId === leaveTypeId);
  const available = selectedBalance ? getAvailableBalance(selectedBalance) : 0;
  const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.id === leaveTypeId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (new Date(startDate) > new Date(endDate)) {
      validationErrors.push("End date must be on or after start date");
    }
    if (workingDays <= 0) {
      validationErrors.push("Selected date range contains no working days");
    }
    if (workingDays > available) {
      validationErrors.push(
        `Insufficient balance: ${available} days available, ${workingDays} requested`,
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const event: CalendarEvent = {
      id: `ev-leave-${Date.now()}`,
      companyId: "c1",
      ownerUserId: "u1",
      ownerName: "You",
      eventTypeId: selectedLeaveType?.eventTypeId ?? "et-1",
      eventType: {
        id: selectedLeaveType?.eventTypeId ?? "et-1",
        companyId: "c1",
        name: "Leave",
        color: selectedLeaveType?.color ?? "#10B981",
        isSystem: true,
      },
      title: `${selectedLeaveType?.name ?? "Leave"} - You`,
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${endDate}T23:59:59`).toISOString(),
      allDay: true,
      visibility: "SHARED",
      isRecurring: false,
      leaveRequest: {
        id: `lr-new-${Date.now()}`,
        calendarEventId: `ev-leave-${Date.now()}`,
        leaveTypeId,
        leaveType: selectedBalance?.leaveType ?? {
          id: leaveTypeId,
          companyId: "c1",
          name: selectedLeaveType?.name ?? "Leave",
          color: selectedLeaveType?.color ?? "#10B981",
          defaultAllocation: 25,
          requiresApproval: true,
          carryOver: false,
          isSystem: true,
        },
        status: "PENDING",
        workingDays,
      },
    };

    onSubmit(event);
    resetForm();
    onClose();
  }

  function resetForm() {
    setLeaveTypeId(LEAVE_TYPES[0].id);
    setNotes("");
    setErrors([]);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogTitle>Request Leave</DialogTitle>
      <DialogContent>
        <p className="mb-4">Submit a leave request for approval.</p>
        <form onSubmit={handleSubmit} className="space-y-4" id="leave-form">
          {errors.length > 0 && (
            <div className="rounded-lg bg-error-container p-3 dark:bg-error-container/20">
              {errors.map((err) => (
                <Typography key={err} variant="body-small" color="error">
                  {err}
                </Typography>
              ))}
            </div>
          )}

          <Select
            label="Leave Type"
            value={leaveTypeId}
            onValueChange={setLeaveTypeId}
            variant="outlined"
            options={LEAVE_TYPES.map((type) => ({
              value: type.id,
              label: type.name,
            }))}
          />

          {selectedBalance && (
            <div className="rounded-lg bg-surface-variant/50 p-3 flex items-center gap-2">
              <Icon name="info" size={16} className="text-surface-variant-foreground shrink-0" />
              <Typography variant="body-small" color="surface-variant-foreground">
                Remaining balance:{" "}
                <Typography variant="label-large" as="span">{available} days</Typography>
              </Typography>
            </div>
          )}

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

          <div className="rounded-lg bg-primary-container p-3 dark:bg-primary-container/20 flex items-center gap-2">
            <Icon name="calendar_today" size={16} className="text-primary shrink-0" />
            <Typography variant="body-small" color="primary">
              Working days: <Typography variant="label-large" as="span" color="primary">{workingDays}</Typography>
            </Typography>
          </div>

          <TextField
            variant="outlined"
            label="Notes (optional)"
            className="w-full"
            value={notes}
            onChange={(value) => setNotes(value)}
            placeholder="Reason for leave..."
            multiline
          />

        </form>
      </DialogContent>
      <DialogActions>
        <Button type="button" variant="text" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" form="leave-form" variant="text">
          Submit Request
        </Button>
      </DialogActions>
    </Dialog>
  );
}
