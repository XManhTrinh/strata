"use client";

import { ProgressBar } from "@strata/ui";
import type { LeaveBalance } from "../types/calendar.types";
import { getAvailableBalance } from "../utils/calendar.utils";

interface LeaveBalancePanelProps {
  balances: LeaveBalance[];
  onRequestLeave: () => void;
}

export function LeaveBalancePanel({ balances, onRequestLeave }: LeaveBalancePanelProps) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Leave Balances</h3>
      </div>

      <div className="mt-4 space-y-4">
        {balances.map((balance) => {
          const available = getAvailableBalance(balance);
          const total = balance.allocated + balance.carriedOver + balance.adjustment;
          const usagePercent = total > 0 ? (balance.used / total) * 100 : 0;
          const isLow = available < 3 && available > 0;
          const isDepleted = available <= 0;

          return (
            <div key={balance.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: balance.leaveType.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-on-surface">{balance.leaveType.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isLow && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Low
                    </span>
                  )}
                  {isDepleted && (
                    <span className="inline-flex items-center rounded-full bg-error-container px-1.5 py-0.5 text-[10px] font-medium text-error dark:bg-error-container/30">
                      Depleted
                    </span>
                  )}
                  <span className="text-sm font-medium text-on-surface">
                    {balance.used}/{total}
                  </span>
                </div>
              </div>
              <ProgressBar value={usagePercent} />
              <p className="text-xs text-on-surface-variant">
                {available} days remaining
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onRequestLeave}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Request Leave
      </button>
    </div>
  );
}
