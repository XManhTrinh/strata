"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DataTable, Badge, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/services";
import type { AuditRecord } from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
      <div className="space-y-8">
        <AppBar>
          <div>
            <h1 className="text-[22px] leading-7 font-normal text-foreground">Audit Log</h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              System audit trail showing all entity changes.
            </p>
          </div>
        </AppBar>
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <p className="text-[14px] leading-5 text-destructive mb-6">
              {error?.message || "Failed to load audit data"}
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
      <AppBar>
        <div>
          <h1 className="text-[22px] leading-7 font-normal text-foreground">Audit Log</h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            System audit trail showing all entity changes.
          </p>
        </div>
      </AppBar>

      {/* DataTable */}
      <Card variant="outlined">
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
