export interface RecurrencePattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  daysOfWeek?: number[]; // for WEEKLY: 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // for MONTHLY
  endDate?: Date;
  count?: number;
}

/**
 * Expands a recurrence pattern from a start date, generating instance start dates.
 *
 * Stops at the earliest of:
 * - pattern.endDate
 * - pattern.count occurrences
 * - maxDate (defaults to 365 days from startDate)
 *
 * The first generated date is always the next occurrence AFTER startDate
 * (the startDate itself is the master event, not an instance).
 */
export function expandRecurrence(
  pattern: RecurrencePattern,
  startDate: Date,
  maxDate?: Date,
): Date[] {
  const absoluteMax = maxDate ?? new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const effectiveEndDate = pattern.endDate
    ? new Date(Math.min(pattern.endDate.getTime(), absoluteMax.getTime()))
    : absoluteMax;

  const maxCount = pattern.count ?? Infinity;
  const instances: Date[] = [];

  switch (pattern.frequency) {
    case 'DAILY':
      return expandDaily(startDate, effectiveEndDate, maxCount);
    case 'WEEKLY':
      return expandWeekly(startDate, effectiveEndDate, maxCount, pattern.daysOfWeek ?? []);
    case 'MONTHLY':
      return expandMonthly(startDate, effectiveEndDate, maxCount, pattern.dayOfMonth);
    case 'YEARLY':
      return expandYearly(startDate, effectiveEndDate, maxCount);
    default:
      return instances;
  }
}

function expandDaily(startDate: Date, endDate: Date, maxCount: number): Date[] {
  const instances: Date[] = [];
  const current = new Date(startDate);

  // Start from the day after startDate
  current.setDate(current.getDate() + 1);

  while (current <= endDate && instances.length < maxCount) {
    instances.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return instances;
}

function expandWeekly(
  startDate: Date,
  endDate: Date,
  maxCount: number,
  daysOfWeek: number[],
): Date[] {
  if (daysOfWeek.length === 0) {
    return [];
  }

  const instances: Date[] = [];
  const current = new Date(startDate);

  // Start from the day after startDate
  current.setDate(current.getDate() + 1);

  while (current <= endDate && instances.length < maxCount) {
    if (daysOfWeek.includes(current.getDay())) {
      instances.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return instances;
}

function expandMonthly(
  startDate: Date,
  endDate: Date,
  maxCount: number,
  dayOfMonth?: number,
): Date[] {
  const instances: Date[] = [];
  const targetDay = dayOfMonth ?? startDate.getUTCDate();

  // Start from the next month
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth() + 1;

  while (instances.length < maxCount) {
    if (month > 11) {
      month = 0;
      year++;
    }

    // Clamp to the last day of the month
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const actualDay = Math.min(targetDay, lastDayOfMonth);

    const instanceDate = new Date(Date.UTC(year, month, actualDay));

    if (instanceDate > endDate) {
      break;
    }

    if (instanceDate > startDate) {
      instances.push(instanceDate);
    }

    month++;
  }

  return instances;
}

function expandYearly(startDate: Date, endDate: Date, maxCount: number): Date[] {
  const instances: Date[] = [];
  const targetMonth = startDate.getUTCMonth();
  const targetDay = startDate.getUTCDate();

  let currentYear = startDate.getUTCFullYear() + 1;

  while (instances.length < maxCount) {
    // Handle Feb 29 on non-leap years by using Feb 28
    const lastDayOfMonth = new Date(Date.UTC(currentYear, targetMonth + 1, 0)).getUTCDate();
    const actualDay = Math.min(targetDay, lastDayOfMonth);

    const instanceDate = new Date(Date.UTC(currentYear, targetMonth, actualDay));

    if (instanceDate > endDate) {
      break;
    }

    instances.push(instanceDate);
    currentYear++;
  }

  return instances;
}
