"use client";

import { Badge } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface Report {
  id: string;
  name: string;
  type: "HEADCOUNT" | "CAPACITY" | "BUDGET" | "LEAVE";
  status: "COMPLETED" | "PROCESSING" | "FAILED";
  generatedAt: string;
  generatedBy: string;
}

const mockReports: Report[] = [
  { id: "1", name: "Q4 2024 Headcount Report", type: "HEADCOUNT", status: "COMPLETED", generatedAt: "2024-12-14 10:30", generatedBy: "Admin" },
  { id: "2", name: "Engineering Capacity Overview", type: "CAPACITY", status: "COMPLETED", generatedAt: "2024-12-13 15:45", generatedBy: "Marcus Johnson" },
  { id: "3", name: "December Budget Variance", type: "BUDGET", status: "PROCESSING", generatedAt: "2024-12-15 09:00", generatedBy: "System" },
  { id: "4", name: "Annual Leave Summary 2024", type: "LEAVE", status: "COMPLETED", generatedAt: "2024-12-12 08:00", generatedBy: "HR Team" },
  { id: "5", name: "Team Capacity Heatmap", type: "CAPACITY", status: "FAILED", generatedAt: "2024-12-11 14:20", generatedBy: "Admin" },
];

const statusVariant: Record<Report["status"], "success" | "warning" | "error"> = {
  COMPLETED: "success",
  PROCESSING: "warning",
  FAILED: "error",
};

const typeLabels: Record<Report["type"], string> = {
  HEADCOUNT: "Headcount",
  CAPACITY: "Capacity",
  BUDGET: "Budget",
  LEAVE: "Leave",
};

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reports</h1>
          <p className="text-xs text-muted-foreground">
            Generate and download organizational reports.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Generate Report
        </button>
      </AppBar>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockReports.map((report) => (
          <div
            key={report.id}
            className="rounded-md border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {report.name}
              </h3>
              <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Type: <span className="font-medium text-foreground">{typeLabels[report.type]}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Generated: {report.generatedAt}
              </p>
              <p className="text-xs text-muted-foreground">
                By: {report.generatedBy}
              </p>
            </div>
            {report.status === "COMPLETED" && (
              <button
                type="button"
                className="w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Download
              </button>
            )}
            {report.status === "PROCESSING" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
