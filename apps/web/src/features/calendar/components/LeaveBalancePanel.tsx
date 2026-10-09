"use client";

import { ProgressBar } from "@strata/ui";
import { AssistChip, Button } from "@vkieu/mui";
import type { LeaveBalance } from "../types/calendar.types";
import { getAvailableBalance } from "../utils/calendar.utils";

interface LeaveBalancePanelProps {
  balances: LeaveBalance[];
  onRequestLeave: () => void;
}

export function LeaveBalancePanel({ balances, onRequestLeave }: LeaveBalancePanelProps) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <h6 className="text-title-small">Leave Balances</h6>

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
                  <span className="text-body-medium">{balance.leaveType.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isLow && (
                    <AssistChip className="h-5 text-[10px] px-1.5 text-amber-800 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                      Low
                    </AssistChip>
                  )}
                  {isDepleted && (
                    <AssistChip className="h-5 text-[10px] px-1.5 text-error bg-error-container dark:bg-error-container/30">
                      Depleted
                    </AssistChip>
                  )}
                  <span className="text-label-large">
                    {balance.used}/{total}
                  </span>
                </div>
              </div>
              <ProgressBar value={usagePercent} />
              <p className="text-body-small text-on-surface-variant">
                {available} days remaining
              </p>
            </div>
          );
        })}
      </div>

      <Button variant="filled" onClick={onRequestLeave} className="w-full mt-4">
        Request Leave
      </Button>
    </div>
  );
}
