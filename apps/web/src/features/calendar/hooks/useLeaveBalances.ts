"use client";

import { useState } from "react";
import type { LeaveBalance } from "../types/calendar.types";

function generateMockBalances(): LeaveBalance[] {
  const year = new Date().getFullYear();

  return [
    {
      id: "bal-1", companyId: "c1", userId: "u1", leaveTypeId: "lt-1", year,
      allocated: 25, used: 7, adjustment: 0, carriedOver: 0,
      leaveType: { id: "lt-1", companyId: "c1", name: "Annual", color: "#10B981", defaultAllocation: 25, requiresApproval: true, carryOver: true, maxCarryOverDays: 5, isSystem: true },
    },
    {
      id: "bal-2", companyId: "c1", userId: "u1", leaveTypeId: "lt-2", year,
      allocated: 10, used: 2, adjustment: 0, carriedOver: 0,
      leaveType: { id: "lt-2", companyId: "c1", name: "Sick", color: "#EF4444", defaultAllocation: 10, requiresApproval: true, carryOver: false, isSystem: true },
    },
    {
      id: "bal-3", companyId: "c1", userId: "u1", leaveTypeId: "lt-3", year,
      allocated: 3, used: 2, adjustment: 0, carriedOver: 0,
      leaveType: { id: "lt-3", companyId: "c1", name: "Personal", color: "#8B5CF6", defaultAllocation: 3, requiresApproval: true, carryOver: false, isSystem: true },
    },
    {
      id: "bal-4", companyId: "c1", userId: "u1", leaveTypeId: "lt-4", year,
      allocated: 5, used: 0, adjustment: 0, carriedOver: 0,
      leaveType: { id: "lt-4", companyId: "c1", name: "Conference", color: "#8B5CF6", defaultAllocation: 5, requiresApproval: true, carryOver: false, isSystem: true },
    },
    {
      id: "bal-5", companyId: "c1", userId: "u1", leaveTypeId: "lt-5", year,
      allocated: 5, used: 0, adjustment: 0, carriedOver: 0,
      leaveType: { id: "lt-5", companyId: "c1", name: "Training", color: "#F59E0B", defaultAllocation: 5, requiresApproval: true, carryOver: false, isSystem: true },
    },
  ];
}

export interface UseLeaveBalancesReturn {
  balances: LeaveBalance[];
  isLoading: boolean;
  deductBalance: (leaveTypeId: string, days: number) => void;
}

export function useLeaveBalances(): UseLeaveBalancesReturn {
  const [balances, setBalances] = useState<LeaveBalance[]>(() => generateMockBalances());
  const isLoading = false;

  function deductBalance(leaveTypeId: string, days: number) {
    setBalances((prev) =>
      prev.map((b) =>
        b.leaveTypeId === leaveTypeId ? { ...b, used: b.used + days } : b
      )
    );
  }

  return { balances, isLoading, deductBalance };
}
