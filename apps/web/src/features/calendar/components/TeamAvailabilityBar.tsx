"use client";


interface TeamAvailabilityBarProps {
  available: number;
  total: number;
}

export function TeamAvailabilityBar({ available, total }: TeamAvailabilityBarProps) {
  const percentage = total > 0 ? (available / total) * 100 : 100;
  const colorClass =
    percentage > 75
      ? "bg-tertiary"
      : percentage >= 50
        ? "bg-secondary"
        : "bg-error";

  const textColor =
    percentage > 75
      ? "text-tertiary"
      : percentage >= 50
        ? "text-secondary"
        : "text-error";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden="true" />
        <span className={`text-label-large ${textColor}`}>
          {available}/{total} available today
        </span>
      </div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-variant">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
