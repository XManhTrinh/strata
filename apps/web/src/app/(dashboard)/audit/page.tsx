"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@strata/mui/buttons";
import { IconButton } from "@strata/mui/buttons";
import { Icon } from "@strata/mui";
import { Card, CardContent, CardHeader, CardTitle } from "@strata/mui";
import { Chip } from "@strata/mui";
import { Search } from "@strata/mui";
import { Divider } from "@strata/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useAuditLog } from "@/services";
import type { AuditRecord } from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
  CREATE: { icon: "add_circle", label: "Created", color: "text-tertiary" },
  UPDATE: { icon: "edit", label: "Updated", color: "text-primary" },
  DELETE: { icon: "delete", label: "Deleted", color: "text-error" },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, isError, error, refetch } = useAuditLog({
    page,
    pageSize,
  });

  const records = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const totalRecords = data?.total ?? 0;

  // Client-side search filter
  const filtered = search
    ? records.filter(
        (r) =>
          r.action.toLowerCase().includes(search.toLowerCase()) ||
          r.entityType.toLowerCase().includes(search.toLowerCase()) ||
          (r.userName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          r.entityId.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <motion.div
        className="flex flex-col gap-6"
        variants={pageTransitionVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={defaultTransition}
      >
        <PageHeader totalRecords={0} />
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <p className="text-[16px] leading-6 font-medium text-surface-foreground mb-1">
              Unable to load audit log
            </p>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              {error?.message || "Something went wrong. Please try again."}
            </p>
            <Button variant="tonal" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Main Content ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <PageHeader totalRecords={totalRecords} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Search
          value={search}
          onValueChange={setSearch}
          placeholder="Filter by user, action, entity..."
          className="max-w-sm flex-1"
        />
        <div className="flex items-center gap-2">
          <Chip variant="filter" selected={!search} onClick={() => setSearch("")}>
            All
          </Chip>
          <Chip variant="filter" selected={search === "CREATE"} onClick={() => setSearch("CREATE")}>
            Created
          </Chip>
          <Chip variant="filter" selected={search === "UPDATE"} onClick={() => setSearch("UPDATE")}>
            Updated
          </Chip>
          <Chip variant="filter" selected={search === "DELETE"} onClick={() => setSearch("DELETE")}>
            Deleted
          </Chip>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-[220px]" />
                    <Skeleton className="h-3 w-[140px]" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-16 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/50 mb-6">
              <Icon name="history" size={24} className="text-surface-variant-foreground" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              No audit records
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              {search ? `No records matching "${search}". Try a different filter.` : "Activity will appear here as changes are made."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && filtered.length > 0 && (
        <>
          <Card variant="elevated">
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((record) => {
                      const config = actionConfig[record.action] ?? {
                        icon: "info",
                        label: record.action,
                        color: "text-surface-variant-foreground",
                      };
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar name={record.userName ?? record.userId} size="s" />
                              <span className="text-[14px] font-medium truncate max-w-[160px]">
                                {record.userName ?? record.userId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon name={config.icon} size={18} className={config.color} />
                              <span className={`text-[14px] font-medium ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Chip variant="assist">
                              {record.entityType}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <code className="text-[12px] font-mono text-surface-variant-foreground bg-surface-variant/50 px-1.5 py-0.5 rounded">
                              {record.entityId.slice(0, 12)}…
                            </code>
                          </TableCell>
                          <TableCell className="text-right text-[13px] text-surface-variant-foreground">
                            {formatRelativeTime(record.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-outline-variant">
                {filtered.map((record) => {
                  const config = actionConfig[record.action] ?? {
                    icon: "info",
                    label: record.action,
                    color: "text-surface-variant-foreground",
                  };
                  return (
                    <div key={record.id} className="flex items-start gap-3 p-4">
                      <Avatar name={record.userName ?? record.userId} size="s" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-surface-foreground truncate">
                            {record.userName ?? record.userId}
                          </span>
                          <span className="text-[12px] text-surface-variant-foreground shrink-0">
                            {formatRelativeTime(record.createdAt)}
                          </span>
                        </div>
                        <p className="text-[13px] text-surface-variant-foreground mt-0.5">
                          <span className={config.color}>{config.label}</span>
                          {" "}
                          <span className="text-surface-variant-foreground">{record.entityType}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-surface-variant-foreground">
                Page {page} of {totalPages} · {totalRecords} records
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Icon name="chevron_left" size={18} />
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <Icon name="chevron_right" size={18} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Page Header ────────────────────────────────────────────────────────────────

function PageHeader({ totalRecords }: { totalRecords: number }) {
  return (
    <AppBar className="justify-between">
      <div>
        <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
          Audit Log
        </h1>
        <p className="text-[14px] leading-5 text-surface-variant-foreground">
          Track all changes across your organization.
          {totalRecords > 0 && ` ${totalRecords} total records.`}
        </p>
      </div>
    </AppBar>
  );
}
