"use client";

interface TeamAvailabilityBarProps {
  available: number;
  total: number;
}

export function TeamAvailabilityBar({ available, total }: TeamAvailabilityBarProps) {
  const percentage = total > 0 ? (available / total) * 100 : 100;
  const colorClass =
    percentage > 75
      ? "bg-green-500"
      : percentage >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  const textColor =
    percentage > 75
      ? "text-green-700 dark:text-green-300"
      : percentage >= 50
        ? "text-yellow-700 dark:text-yellow-300"
        : "text-red-700 dark:text-red-300";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden="true" />
        <span className={`text-sm font-medium ${textColor}`}>
          {available}/{total} available today
        </span>
      </div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
