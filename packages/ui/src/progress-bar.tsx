"use client";

import React from "react";

export interface ProgressBarProps {
  /** Progress value 0–100. */
  value: number;
  /** Show a percentage label to the right. */
  showLabel?: boolean;
  /** Thresholds (in %) at which the bar color changes. Below green → green, below yellow → yellow, above → red. */
  colorThresholds?: { green: number; yellow: number };
  /** Additional className on the outer wrapper. */
  className?: string;
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
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colorClass = getBarColor(clamped, colorThresholds);

  return (
    <div className={`flex items-center gap-2${className ? ` ${className}` : ""}`}>
      <div
        className="relative h-1 w-full overflow-hidden rounded-full bg-secondary-container"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% progress`}
      >
        <div
          className={`absolute inset-y-0 inset-s-0 rounded-full transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[3ch] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
