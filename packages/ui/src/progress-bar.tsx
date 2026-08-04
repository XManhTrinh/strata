"use client";

import React from "react";
import { motion } from "motion/react";

export interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  colorThresholds?: { green: number; yellow: number };
}

function getBarColor(value: number, thresholds: { green: number; yellow: number }): string {
  if (value < thresholds.green) return "bg-green-500";
  if (value < thresholds.yellow) return "bg-yellow-500";
  return "bg-red-500";
}

export function ProgressBar({
  value,
  showLabel = false,
  colorThresholds = { green: 70, yellow: 90 },
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const colorClass = getBarColor(clampedValue, colorThresholds);

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clampedValue}% progress`}
      >
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[3ch] text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
