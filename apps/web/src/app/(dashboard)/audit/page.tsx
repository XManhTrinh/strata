"use client";

import { useState } from "react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { useAuditLog } from "@/services";
import type { AuditRecord } from "@/services";

type AuditRow = AuditRecord & Record<string, unknown>;

const actionVariant: Record<string, "success" | "info" | "error"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
};

const columns: Column<AuditRow>[] = [
  {
    key: "createdAt",
    header: "Timestamp",
    sortable: true,
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: "userName",
    header: "User",
    sortable: true,
    render: (row) => row.userName || row.userId,
  },
  { key: "entityType", header: "Entity", sortable: true },
  { key: "entityId", header: "Entity ID" },
  {
    key: "action",
    header: "Operation",
    sortable: true,
    render: (row) => (
      <Badge variant={actionVariant[row.action] ?? "info"}>{row.action}</Badge>
    ),
  },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = useAuditLog({
    page,
    pageSize,
  });

  const records = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isError) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Audit Log</h1>
            <p className="text-xs text-muted-foreground">
              System audit trail showing all entity changes.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load audit data"}
          </p>
          <Button onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Audit Log</h1>
          <p className="text-xs text-muted-foreground">
            System audit trail showing all entity changes.
          </p>
        </div>
      </AppBar>

      <DataTable<AuditRow>
        columns={columns}
        data={records as AuditRow[]}
        isLoading={isLoading}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No audit records found"
      />
    </div>
  );
}
