"use client";

import { DataTable, Badge, type Column } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";

interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  entityType: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  [key: string]: unknown;
}

const mockAuditRecords: AuditRecord[] = [
  { id: "1", timestamp: "2024-12-15 14:32:10", user: "admin@strata.io", entityType: "Employee", entityId: "EMP-001", operation: "UPDATE" },
  { id: "2", timestamp: "2024-12-15 14:28:05", user: "sarah.chen@strata.io", entityType: "LeaveRequest", entityId: "LR-042", operation: "CREATE" },
  { id: "3", timestamp: "2024-12-15 13:45:22", user: "admin@strata.io", entityType: "Budget", entityId: "BDG-007", operation: "UPDATE" },
  { id: "4", timestamp: "2024-12-15 12:10:48", user: "marcus.j@strata.io", entityType: "Squad", entityId: "SQD-003", operation: "UPDATE" },
  { id: "5", timestamp: "2024-12-15 11:55:30", user: "admin@strata.io", entityType: "Employee", entityId: "EMP-009", operation: "CREATE" },
  { id: "6", timestamp: "2024-12-15 10:20:15", user: "hr@strata.io", entityType: "Department", entityId: "DEP-002", operation: "DELETE" },
  { id: "7", timestamp: "2024-12-14 16:45:00", user: "admin@strata.io", entityType: "Role", entityId: "ROLE-005", operation: "CREATE" },
  { id: "8", timestamp: "2024-12-14 15:30:22", user: "emily.r@strata.io", entityType: "CapacityAllocation", entityId: "CAP-011", operation: "UPDATE" },
];

const operationVariant: Record<AuditRecord["operation"], "success" | "info" | "error"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
};

const columns: Column<AuditRecord>[] = [
  { key: "timestamp", header: "Timestamp", sortable: true },
  { key: "user", header: "User", sortable: true },
  { key: "entityType", header: "Entity", sortable: true },
  { key: "entityId", header: "Entity ID" },
  {
    key: "operation",
    header: "Operation",
    sortable: true,
    render: (row) => (
      <Badge variant={operationVariant[row.operation]}>{row.operation}</Badge>
    ),
  },
];

export default function AuditPage() {
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

      <DataTable<AuditRecord>
        columns={columns}
        data={mockAuditRecords}
        pageSize={10}
        emptyMessage="No audit records found"
      />
    </div>
  );
}
