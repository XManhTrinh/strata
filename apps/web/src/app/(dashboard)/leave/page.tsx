"use client";

import { Badge } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface LeaveRequest {
  id: string;
  employee: string;
  type: "ANNUAL" | "SICK" | "PERSONAL" | "PARENTAL" | "UNPAID";
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string;
}

const mockLeaveRequests: LeaveRequest[] = [
  { id: "1", employee: "Sarah Chen", type: "ANNUAL", startDate: "2024-12-20", endDate: "2024-12-27", status: "PENDING", reason: "Holiday vacation" },
  { id: "2", employee: "Marcus Johnson", type: "SICK", startDate: "2024-12-15", endDate: "2024-12-16", status: "APPROVED", reason: "Medical appointment" },
  { id: "3", employee: "Emily Rodriguez", type: "PERSONAL", startDate: "2024-12-18", endDate: "2024-12-18", status: "PENDING", reason: "Personal matter" },
  { id: "4", employee: "David Park", type: "ANNUAL", startDate: "2024-12-23", endDate: "2025-01-03", status: "APPROVED", reason: "Year-end break" },
  { id: "5", employee: "Aisha Patel", type: "PARENTAL", startDate: "2025-01-15", endDate: "2025-04-15", status: "APPROVED", reason: "Parental leave" },
  { id: "6", employee: "James Wilson", type: "ANNUAL", startDate: "2024-12-22", endDate: "2024-12-24", status: "REJECTED", reason: "Holiday travel" },
];

const statusVariant: Record<LeaveRequest["status"], "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "info",
};

const typeLabels: Record<LeaveRequest["type"], string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  PERSONAL: "Personal",
  PARENTAL: "Parental",
  UNPAID: "Unpaid",
};

export default function LeavePage() {
  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Leave</h1>
          <p className="text-xs text-muted-foreground">
            Leave requests and approval management.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Request Leave
        </button>
      </AppBar>

      <div className="space-y-3">
        {mockLeaveRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between rounded-md border border-border bg-card p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-foreground">{request.employee}</p>
                <Badge variant="default">{typeLabels[request.type]}</Badge>
                <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {request.startDate} → {request.endDate} &middot; {request.reason}
              </p>
            </div>
            {request.status === "PENDING" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
