"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { useReports, useCreateReport, type ReportRecord, type ReportType } from "@/services";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chips";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@/components/ui/divider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

const statusIcon: Record<string, string> = {
  completed: "check_circle",
  processing: "pending",
  pending: "schedule",
  failed: "error",
};

const statusColor: Record<string, string> = {
  completed: "text-green-600 dark:text-green-400",
  processing: "text-amber-600 dark:text-amber-400",
  pending: "text-muted-foreground",
  failed: "text-destructive",
};

const typeLabels: Record<ReportType, string> = {
  headcount: "Headcount",
  capacity: "Capacity",
  budget: "Budget",
  leave: "Leave",
};

const typeIcons: Record<ReportType, string> = {
  headcount: "group",
  capacity: "bar_chart",
  budget: "account_balance",
  leave: "event_busy",
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
  const { data: reports, isLoading, error, refetch } = useReports();
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
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Reports</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Generate and download organizational reports.
            </p>
          </div>
        </AppBar>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="outlined">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Reports</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Generate and download organizational reports.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              Failed to load reports. Please try again later.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportList = reports ?? [];

  return (
    <motion.div
      className="space-y-8"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Reports</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Generate and download organizational reports.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Icon name="add" size={18} />
          Generate Report
        </Button>
      </AppBar>

      {/* Reports Grid */}
      {reportList.length === 0 ? (
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <Icon name="description" size={40} className="text-muted-foreground/40 mb-2" />
            <p className="text-[14px] leading-5 text-muted-foreground">
              No reports generated yet.
            </p>
            <p className="text-[12px] leading-4 text-muted-foreground mt-1">
              Click &quot;Generate Report&quot; to create your first report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportList.map((report: ReportRecord) => (
            <Card key={report.id} variant="outlined">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/12">
                      <Icon name={typeIcons[report.type]} size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-[14px] leading-5 font-medium text-foreground">
                        {typeLabels[report.type]} Report
                      </h3>
                      <p className="text-[12px] leading-4 text-muted-foreground">
                        {formatDate(report.requestedAt)}
                      </p>
                    </div>
                  </div>
                  <Chip
                    variant="assist"
                    leadingIcon={statusIcon[report.status]}
                  >
                    <span className={statusColor[report.status]}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </Chip>
                </div>

                <Divider />

                <div className="space-y-1">
                  {report.completedAt && (
                    <p className="text-[12px] leading-4 text-muted-foreground">
                      Completed: {formatDate(report.completedAt)}
                    </p>
                  )}
                  <p className="text-[12px] leading-4 text-muted-foreground">
                    Requested by: {report.requestedBy}
                  </p>
                </div>

                {report.status === "completed" && (
                  <Button variant="secondary" className="w-full">
                    <Icon name="download" size={18} />
                    Download
                  </Button>
                )}
                {(report.status === "processing" || report.status === "pending") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/12">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                )}
                {report.status === "failed" && report.error && (
                  <p className="text-[12px] leading-4 text-destructive">{report.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Select a report type to generate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">
                Report Type
              </label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ReportType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={createReport.isPending}
            >
              {createReport.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
