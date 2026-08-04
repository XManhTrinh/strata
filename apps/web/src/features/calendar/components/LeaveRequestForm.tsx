"use client";

import { useState } from "react";
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

export function LeaveRequestForm({ isOpen, onClose, onSubmit, balances, defaultDate, defaultEndDate }: LeaveRequestFormProps) {
  const [leaveTypeId, setLeaveTypeId] = useState(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState(defaultDate ? formatDateInput(defaultDate) : formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(defaultEndDate ? formatDateInput(defaultEndDate) : defaultDate ? formatDateInput(defaultDate) : formatDateInput(new Date()));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

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
      validationErrors.push(`Insufficient balance: ${available} days available, ${workingDays} requested (shortfall: ${workingDays - available} days)`);
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
      eventType: { id: selectedLeaveType?.eventTypeId ?? "et-1", companyId: "c1", name: "Leave", color: selectedLeaveType?.color ?? "#10B981", isSystem: true },
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
        leaveType: selectedBalance?.leaveType ?? { id: leaveTypeId, companyId: "c1", name: selectedLeaveType?.name ?? "Leave", color: selectedLeaveType?.color ?? "#10B981", defaultAllocation: 25, requiresApproval: true, carryOver: false, isSystem: true },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Request Leave</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errors.length > 0 && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              {errors.map((err) => (
                <p key={err} className="text-sm text-red-700 dark:text-red-300">{err}</p>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="leave-type" className="block text-sm font-medium text-foreground">Leave Type</label>
            <select
              id="leave-type"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {LEAVE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {selectedBalance && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Remaining balance: <span className="font-medium text-foreground">{available} days</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="leave-start-date" className="block text-sm font-medium text-foreground">Start Date</label>
              <input
                id="leave-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="leave-end-date" className="block text-sm font-medium text-foreground">End Date</label>
              <input
                id="leave-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Working days: <span className="font-medium">{workingDays}</span>
            </p>
          </div>

          <div>
            <label htmlFor="leave-notes" className="block text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea
              id="leave-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Reason for leave..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Submit Request
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
