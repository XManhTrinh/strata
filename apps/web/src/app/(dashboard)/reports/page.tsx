"use client";

import { useState } from "react";
import { Badge } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { useReports, useCreateReport, type ReportRecord, type ReportType } from "@/services";

const statusVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success",
  processing: "warning",
  pending: "default",
  failed: "error",
};

const typeLabels: Record<ReportType, string> = {
  headcount: "Headcount",
  capacity: "Capacity",
  budget: "Budget",
  leave: "Leave",
};

const reportTypeOptions: { value: ReportType; label: string }[] = [
  { value: "headcount", label: "Headcount Report" },
  { value: "capacity", label: "Capacity Overview" },
  { value: "budget", label: "Budget Variance" },
  { value: "leave", label: "Leave Summary" },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function ReportsPage() {
  const { data: reports, isLoading, error } = useReports();
  const createReport = useCreateReport();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>("headcount");

  const handleGenerate = () => {
    createReport.mutate(
      { type: selectedType },
      {
        onSuccess: () => {
          setShowDialog(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Reports</h1>
            <p className="text-xs text-muted-foreground">
              Generate and download organizational reports.
            </p>
          </div>
        </AppBar>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Reports</h1>
            <p className="text-xs text-muted-foreground">
              Generate and download organizational reports.
            </p>
          </div>
        </AppBar>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            Failed to load reports. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const reportList = reports ?? [];

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
          onClick={() => setShowDialog(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Generate Report
        </button>
      </AppBar>

      {reportList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Generate Report&quot; to create your first report.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportList.map((report: ReportRecord) => (
            <div
              key={report.id}
              className="rounded-md border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {typeLabels[report.type]} Report
                </h3>
                <Badge variant={statusVariant[report.status] ?? "default"}>
                  {report.status.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Type: <span className="font-medium text-foreground">{typeLabels[report.type]}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested: {formatDate(report.requestedAt)}
                </p>
                {report.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {formatDate(report.completedAt)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  By: {report.requestedBy}
                </p>
              </div>
              {report.status === "completed" && (
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Download
                </button>
              )}
              {(report.status === "processing" || report.status === "pending") && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                </div>
              )}
              {report.status === "failed" && report.error && (
                <p className="text-xs text-destructive">{report.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generate Report Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Generate Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a report type to generate.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="report-type" className="block text-sm font-medium text-foreground">
                  Report Type
                </label>
                <select
                  id="report-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ReportType)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {reportTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={createReport.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createReport.isPending ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
